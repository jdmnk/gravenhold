import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import {
  PIXELLAB_API_BASE_URL,
  PIXELLAB_POLL_INTERVAL_MS,
  PIXELLAB_POLL_TIMEOUT_MS,
  requirePixellabToken,
} from "./env";

type JsonRecord = Record<string, unknown>;

type GenerateUiInput = {
  colorPalette?: string;
  description: string;
  height: number;
  mode: "pixflux" | "ui-pro";
  onStatus?: (message: string) => void;
  outputPath: string;
  seed?: number;
  transparent: boolean;
  width: number;
};

const baseUrl = PIXELLAB_API_BASE_URL.replace(/\/$/, "");

export async function generatePixellabUi(input: GenerateUiInput): Promise<void> {
  const status = input.onStatus ?? (() => {});
  if (input.mode === "ui-pro") {
    await generateUiPro(input, status);
  } else {
    await generatePixflux(input, status);
  }
}

async function generatePixflux(input: GenerateUiInput, status: (message: string) => void): Promise<void> {
  const requestBody = {
    background_removal_task: "remove_simple_background",
    description: input.description,
    image_size: {
      height: input.height,
      width: input.width,
    },
    no_background: input.transparent,
    seed: input.seed,
    text_guidance_scale: 8,
  };

  status("Submitting /create-image-pixflux request. This can take a few minutes; do not interrupt after submission.");
  const created = await withWaitingStatus(
    "Waiting for PixelLab image response",
    status,
    pixellabPost("/create-image-pixflux", requestBody),
  );
  status("PixelLab returned a response.");

  const wroteArtifact = await tryWriteArtifact(created, input.outputPath);
  if (!wroteArtifact) {
    writeDebugJson(input.outputPath, created);
    throw new Error("PixelLab response did not include an image artifact.");
  }
  status("Saved generated image artifact.");
}

async function generateUiPro(input: GenerateUiInput, status: (message: string) => void): Promise<void> {
  const requestBody = {
    color_palette: input.colorPalette,
    description: input.description,
    image_size: {
      height: input.height,
      width: input.width,
    },
    no_background: input.transparent,
    seed: input.seed,
  };

  status("Submitting /generate-ui-v2 request. This can spend Pro-grid quota; do not interrupt after submission.");
  const created = await withWaitingStatus(
    "Waiting for PixelLab Pro job response",
    status,
    pixellabPost("/generate-ui-v2", requestBody),
  );
  status("PixelLab accepted the request.");
  const immediateArtifact = await tryWriteArtifact(created, input.outputPath);
  if (immediateArtifact) {
    status("PixelLab returned an image immediately.");
    return;
  }

  const jobId = findStringValue(created, ["background_job_id", "job_id"]);
  if (!jobId) {
    writeDebugJson(input.outputPath, created);
    throw new Error("PixelLab response did not include a background job id or image artifact.");
  }

  status(`Queued background job ${jobId}.`);
  const completed = await pollJob(jobId, status);
  const wroteArtifact = await tryWriteArtifact(completed, input.outputPath);
  if (!wroteArtifact) {
    writeDebugJson(input.outputPath, completed);
    throw new Error(`PixelLab job ${jobId} completed, but no image artifact was found in the response.`);
  }
  status("Saved generated image artifact.");
}

async function pixellabPost(path: string, body: unknown): Promise<unknown> {
  return pixellabJson(path, {
    body: JSON.stringify(body),
    method: "POST",
  });
}

async function pixellabGet(path: string): Promise<unknown> {
  return pixellabJson(path, {
    method: "GET",
  });
}

async function pixellabJson(path: string, init: RequestInit): Promise<unknown> {
  const token = requirePixellabToken();
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  const text = await response.text();
  const json = parseJson(text);

  if (!response.ok) {
    throw new Error(`PixelLab ${response.status}: ${extractError(json) ?? text.slice(0, 500)}`);
  }

  return json;
}

async function pollJob(jobId: string, status: (message: string) => void): Promise<unknown> {
  const startedAt = Date.now();
  let lastStatus = "";

  while (Date.now() - startedAt < PIXELLAB_POLL_TIMEOUT_MS) {
    const job = await pixellabGet(`/background-jobs/${jobId}`);
    const jobStatus = findStringValue(job, ["status", "state"])?.toLowerCase() ?? "unknown";
    const elapsedSeconds = Math.round((Date.now() - startedAt) / 1000);

    if (jobStatus !== lastStatus) {
      status(`Job ${jobId}: ${jobStatus} after ${elapsedSeconds}s.`);
      lastStatus = jobStatus;
    } else {
      status(`Job ${jobId}: still ${jobStatus} after ${elapsedSeconds}s.`);
    }

    if (jobStatus === "completed" || jobStatus === "succeeded" || jobStatus === "success" || jobStatus === "done") {
      return job;
    }
    if (jobStatus === "failed" || jobStatus === "error" || jobStatus === "cancelled") {
      throw new Error(`PixelLab job ${jobId} failed: ${extractError(job) ?? "unknown error"}`);
    }

    await sleep(PIXELLAB_POLL_INTERVAL_MS);
  }

  throw new Error(`PixelLab job ${jobId} did not finish within ${PIXELLAB_POLL_TIMEOUT_MS}ms.`);
}

async function tryWriteArtifact(payload: unknown, outputPath: string): Promise<boolean> {
  const base64 = findImageBase64(payload);
  if (base64) {
    writeImage(outputPath, Buffer.from(stripDataUrlPrefix(base64), "base64"));
    return true;
  }

  const url = findImageUrl(payload);
  if (!url) return false;

  const response = await fetch(url, {
    headers: url.startsWith(baseUrl) ? { Authorization: `Bearer ${requirePixellabToken()}` } : undefined,
  });
  if (!response.ok) {
    throw new Error(`Could not download PixelLab artifact ${url}: ${response.status}`);
  }

  writeImage(outputPath, Buffer.from(await response.arrayBuffer()));
  return true;
}

function findImageBase64(value: unknown): string | null {
  if (typeof value === "string") {
    if (value.startsWith("data:image/")) return value;
    if (looksLikeBase64Image(value)) return value;
    return null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findImageBase64(item);
      if (found) return found;
    }
    return null;
  }

  if (!isRecord(value)) return null;

  for (const [key, child] of Object.entries(value)) {
    if (
      typeof child === "string"
      && ["base64", "b64", "b64_json", "image_base64"].includes(key)
      && looksLikeBase64Image(child)
    ) {
      return child;
    }
  }

  for (const child of Object.values(value)) {
    const found = findImageBase64(child);
    if (found) return found;
  }

  return null;
}

function findImageUrl(value: unknown): string | null {
  if (typeof value === "string") {
    if (/^https?:\/\/.+\.(png|webp|jpg|jpeg)(\?.*)?$/i.test(value)) return value;
    return null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findImageUrl(item);
      if (found) return found;
    }
    return null;
  }

  if (!isRecord(value)) return null;

  for (const [key, child] of Object.entries(value)) {
    if (
      typeof child === "string"
      && key.toLowerCase().includes("url")
      && /^https?:\/\//.test(child)
    ) {
      return child;
    }
  }

  for (const child of Object.values(value)) {
    const found = findImageUrl(child);
    if (found) return found;
  }

  return null;
}

function findStringValue(value: unknown, keys: string[]): string | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findStringValue(item, keys);
      if (found) return found;
    }
    return null;
  }

  if (!isRecord(value)) return null;

  for (const key of keys) {
    const child = value[key];
    if (typeof child === "string" && child.length > 0) return child;
  }

  for (const child of Object.values(value)) {
    const found = findStringValue(child, keys);
    if (found) return found;
  }

  return null;
}

function extractError(value: unknown): string | null {
  const error = findStringValue(value, ["error", "message", "detail"]);
  if (error) return error;
  if (isRecord(value) && isRecord(value.error)) return JSON.stringify(value.error);
  return null;
}

function looksLikeBase64Image(value: string): boolean {
  if (value.length < 100) return false;
  return /^[A-Za-z0-9+/=\s]+$/.test(value) || value.startsWith("data:image/");
}

function stripDataUrlPrefix(value: string): string {
  const separator = value.indexOf(",");
  return value.startsWith("data:image/") && separator !== -1 ? value.slice(separator + 1) : value;
}

function writeImage(outputPath: string, bytes: Buffer) {
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, bytes);
}

function writeDebugJson(outputPath: string, payload: unknown) {
  writeFileSync(`${outputPath}.response.json`, `${JSON.stringify(payload, null, 2)}\n`);
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null;
}

function sleep(ms: number) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

async function withWaitingStatus<T>(
  label: string,
  status: (message: string) => void,
  promise: Promise<T>,
): Promise<T> {
  const startedAt = Date.now();
  const interval = setInterval(() => {
    const elapsedSeconds = Math.round((Date.now() - startedAt) / 1000);
    status(`${label}: still waiting after ${elapsedSeconds}s.`);
  }, 15000);

  try {
    return await promise;
  } finally {
    clearInterval(interval);
  }
}

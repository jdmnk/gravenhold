import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(__dirname, "../../..");

loadDotEnv(resolve(ROOT, ".env"));
loadDotEnv(resolve(ROOT, ".env.local"));
loadDotEnv(resolve(ROOT, "src/.env"));

export const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? "";
export const IMAGE_MODEL = process.env.IMAGE_MODEL ?? "gpt-image-1.5";
export const IMAGE_QUALITY = process.env.IMAGE_QUALITY ?? "medium";
export const REQUEST_DELAY_MS = Number(process.env.IMAGE_REQUEST_DELAY_MS ?? 1200);
export const MAX_CONCURRENCY = Number(process.env.IMAGE_MAX_CONCURRENCY ?? 1);
export const PIXELLAB_API_BASE_URL = process.env.PIXELLAB_API_BASE_URL ?? "https://api.pixellab.ai/v2";
export const PIXELLAB_API_TOKEN = process.env.PIXELLAB_API_TOKEN
  ?? process.env.PIXELLAB_API_KEY
  ?? "";
export const PIXELLAB_POLL_INTERVAL_MS = Number(process.env.PIXELLAB_POLL_INTERVAL_MS ?? 2500);
export const PIXELLAB_POLL_TIMEOUT_MS = Number(process.env.PIXELLAB_POLL_TIMEOUT_MS ?? 180000);

export function requireOpenAiKey(): string {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set. Add it to .env at the project root.");
  }
  return OPENAI_API_KEY;
}

export function requirePixellabToken(): string {
  if (!PIXELLAB_API_TOKEN) {
    throw new Error("PIXELLAB_API_TOKEN is not set. Add it to .env at the project root.");
  }
  return PIXELLAB_API_TOKEN;
}

function loadDotEnv(path: string) {
  if (!existsSync(path)) return;

  for (const rawLine of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separator = line.indexOf("=");
    if (separator === -1) continue;

    const key = line.slice(0, separator).trim();
    const value = unquote(line.slice(separator + 1).trim());
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function unquote(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

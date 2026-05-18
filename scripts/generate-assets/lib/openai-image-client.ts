import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";

import OpenAI from "openai";

import {
  IMAGE_MODEL,
  IMAGE_QUALITY,
  OPENAI_API_KEY,
  requireOpenAiKey,
} from "./env";
import type { AssetFormat, AssetSize } from "./types";

type ImageProvider = "openai" | "openrouter";

const openRouterImageModel =
  process.env.OPENROUTER_IMAGE_MODEL ?? "openai/gpt-5-image-mini";

type GenerateInput = {
  format: AssetFormat;
  outputPath: string;
  prompt: string;
  provider?: ImageProvider;
  size: AssetSize;
  transparent?: boolean;
};

export async function generateImage(input: GenerateInput): Promise<void> {
  const provider = input.provider ?? imageProvider();

  if (provider === "openrouter") {
    await generateWithOpenRouter(input);
    return;
  }

  await generateWithOpenAi(input);
}

function imageProvider(): ImageProvider {
  const provider = process.env.IMAGE_PROVIDER ?? "openai";
  if (provider === "openai" || provider === "openrouter") return provider;
  throw new Error(`Unsupported IMAGE_PROVIDER "${provider}". Use "openai" or "openrouter".`);
}

async function generateWithOpenAi(input: GenerateInput): Promise<void> {
  const client = new OpenAI({
    apiKey: OPENAI_API_KEY || requireOpenAiKey(),
  });

  const response = await client.images.generate({
    background: input.transparent ? "transparent" : "opaque",
    model: IMAGE_MODEL,
    n: 1,
    output_compression: input.format === "png" ? undefined : 90,
    output_format: input.format,
    prompt: input.prompt,
    quality: IMAGE_QUALITY as "low" | "medium" | "high" | "auto",
    size: input.size,
  });

  const b64 = response.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error("OpenAI image generation response did not include b64_json data.");
  }

  mkdirSync(dirname(input.outputPath), { recursive: true });
  writeFileSync(input.outputPath, Buffer.from(b64, "base64"));
}

async function generateWithOpenRouter(input: GenerateInput): Promise<void> {
  const apiKey =
    process.env.OPENROUTER_API_KEY ?? process.env.openrouter_api_key ?? "";

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set. Add it to .env at the project root.");
  }

  if (input.transparent) {
    throw new Error("OpenRouter generation does not support transparent output in this script.");
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    body: JSON.stringify({
      messages: [
        {
          content: input.prompt,
          role: "user",
        },
      ],
      modalities: ["image", "text"],
      model: openRouterImageModel,
      stream: false,
    }),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://gravenhold.local",
      "X-Title": "Gravenhold Image Generator",
    },
    method: "POST",
  });

  const bodyText = await response.text();
  let body: unknown;

  try {
    body = JSON.parse(bodyText);
  } catch {
    throw new Error(`OpenRouter returned non-JSON response: ${bodyText.slice(0, 400)}`);
  }

  if (!response.ok) {
    const message =
      body && typeof body === "object" && "error" in body
        ? (body as { error?: { message?: string } }).error?.message
        : bodyText;
    throw new Error(`OpenRouter image generation failed: ${message ?? bodyText}`);
  }

  const image = extractImageReference(body);
  if (!image) {
    throw new Error(
      `OpenRouter response did not include an image URL or data URL: ${bodyText.slice(0, 1200)}`,
    );
  }

  mkdirSync(dirname(input.outputPath), { recursive: true });
  await writeImageReference(image, input);
}

type ImageReference = {
  b64Json?: string;
  url?: string;
};

function extractImageReference(value: unknown): ImageReference | null {
  if (!value || typeof value !== "object") return null;

  if ("b64_json" in value && typeof value.b64_json === "string") {
    return { b64Json: value.b64_json };
  }

  if ("url" in value && typeof value.url === "string") {
    return { url: value.url };
  }

  if ("image_url" in value) {
    const imageUrl = value.image_url;
    if (imageUrl && typeof imageUrl === "object") {
      const nested = extractImageReference(imageUrl);
      if (nested) return nested;
    }
  }

  if ("imageUrl" in value) {
    const imageUrl = value.imageUrl;
    if (typeof imageUrl === "string") return { url: imageUrl };
    if (imageUrl && typeof imageUrl === "object") {
      const nested = extractImageReference(imageUrl);
      if (nested) return nested;
    }
  }

  for (const nested of Object.values(value)) {
    if (Array.isArray(nested)) {
      for (const item of nested) {
        const image = extractImageReference(item);
        if (image) return image;
      }
    } else if (nested && typeof nested === "object") {
      const image = extractImageReference(nested);
      if (image) return image;
    } else if (typeof nested === "string" && nested.startsWith("data:image/")) {
      return { url: nested };
    }
  }

  return null;
}

async function writeImageReference(
  reference: ImageReference,
  input: GenerateInput,
) {
  const source = await imageReferenceBuffer(reference);

  if (input.format === "webp") {
    writeWebp(source, input.outputPath, input.size);
    return;
  }

  writeFileSync(input.outputPath, source);
}

async function imageReferenceBuffer(reference: ImageReference): Promise<Buffer> {
  if (reference.b64Json) {
    return Buffer.from(reference.b64Json, "base64");
  }

  const url = reference.url;
  if (!url) throw new Error("No image data found in OpenRouter response.");

  if (url.startsWith("data:image/")) {
    const [, base64] = url.split(",", 2);
    if (!base64) throw new Error("Invalid data URL returned by OpenRouter.");
    return Buffer.from(base64, "base64");
  }

  const imageResponse = await fetch(url);
  if (!imageResponse.ok) {
    throw new Error(`Failed to download OpenRouter image URL: ${imageResponse.status}`);
  }

  return Buffer.from(await imageResponse.arrayBuffer());
}

function writeWebp(source: Buffer, outputPath: string, size: AssetSize) {
  const tempDir = mkdtempSync(join(tmpdir(), "gravenhold-image-"));
  const sourcePath = join(tempDir, "source.image");
  const [width, height] = parseSize(size);

  try {
    writeFileSync(sourcePath, source);
    const result = spawnSync(
      "python",
      ["-", sourcePath, outputPath, String(width), String(height)],
      {
        encoding: "utf8",
        input: webpCoverPython,
        maxBuffer: 1024 * 1024,
      },
    );

    if (result.status !== 0) {
      const message = [result.stderr.trim(), result.stdout.trim()]
        .filter(Boolean)
        .join("\n");
      throw new Error(`Failed to convert OpenRouter image to WebP. ${message}`);
    }
  } finally {
    rmSync(tempDir, { force: true, recursive: true });
  }

  readFileSync(outputPath);
}

function parseSize(size: AssetSize): [number, number] {
  const [rawWidth, rawHeight] = size.split("x");
  const width = Number(rawWidth);
  const height = Number(rawHeight);
  return [width, height];
}

const webpCoverPython = String.raw`
from pathlib import Path
from PIL import Image
import sys

source = Path(sys.argv[1])
target = Path(sys.argv[2])
target_width = int(sys.argv[3])
target_height = int(sys.argv[4])
resample = getattr(getattr(Image, "Resampling", Image), "LANCZOS")

image = Image.open(source).convert("RGB")
source_width, source_height = image.size
scale = max(target_width / source_width, target_height / source_height)
next_size = (round(source_width * scale), round(source_height * scale))
image = image.resize(next_size, resample)
left = max(0, (image.width - target_width) // 2)
top = max(0, (image.height - target_height) // 2)
image = image.crop((left, top, left + target_width, top + target_height))
target.parent.mkdir(parents=True, exist_ok=True)
image.save(target, "WEBP", quality=90, method=6, lossless=False)
`;

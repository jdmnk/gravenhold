import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import OpenAI from "openai";

import {
  IMAGE_MODEL,
  IMAGE_PROVIDER,
  IMAGE_QUALITY,
  OPENROUTER_IMAGE_MODEL,
  requireOpenAiKey,
  requireOpenRouterKey,
} from "./env";
import type { AssetFormat, AssetSize } from "./types";

export type ImageProvider = "openai" | "openrouter";

export type GenerateImageInput = {
  format: AssetFormat;
  outputPath: string;
  prompt: string;
  provider?: ImageProvider;
  size: AssetSize;
  transparent?: boolean;
  webpQuality?: number;
};

type GenerateImageSourceInput = {
  assetId: string;
  provider?: ImageProvider;
  prompt: string;
  size: AssetSize;
  transparent?: boolean;
};

type ImageReference = {
  b64Json?: string;
  url?: string;
};

export function imageProvider(rawProvider = IMAGE_PROVIDER): ImageProvider {
  if (rawProvider === "openai" || rawProvider === "openrouter") {
    return rawProvider;
  }

  throw new Error(`Unsupported image provider "${rawProvider}". Use "openai" or "openrouter".`);
}

export function imageModel(provider: ImageProvider): string {
  if (provider === "openrouter") return OPENROUTER_IMAGE_MODEL;
  return IMAGE_MODEL;
}

export async function generateImage(input: GenerateImageInput): Promise<void> {
  const provider = imageProvider(input.provider);
  const source = await generateImageSource({
    assetId: input.outputPath,
    provider,
    prompt: input.prompt,
    size: input.size,
    transparent: input.transparent,
  });

  mkdirSync(dirname(input.outputPath), { recursive: true });

  if (input.format === "webp") {
    writeWebpCover(source, input.outputPath, input.size, input.webpQuality ?? 82);
    return;
  }

  writeFileSync(input.outputPath, source);
}

export async function generateImageSource(
  input: GenerateImageSourceInput,
): Promise<Buffer> {
  const provider = imageProvider(input.provider);
  const reference =
    provider === "openrouter"
      ? await generateWithOpenRouter(input)
      : await generateWithOpenAi(input);

  return imageReferenceBuffer(reference, input.assetId);
}

async function generateWithOpenAi(
  input: GenerateImageSourceInput,
): Promise<ImageReference> {
  const client = new OpenAI({
    apiKey: requireOpenAiKey(),
  });

  const response = await client.images.generate({
    background: input.transparent ? "transparent" : "opaque",
    model: IMAGE_MODEL,
    n: 1,
    output_compression: undefined,
    output_format: "png",
    prompt: input.prompt,
    quality: IMAGE_QUALITY as "low" | "medium" | "high" | "auto",
    size: input.size,
  });

  const image = response.data?.[0];
  if (!image?.b64_json && !image?.url) {
    throw new Error(`OpenAI response for ${input.assetId} did not include b64_json or url.`);
  }

  return { b64Json: image.b64_json, url: image.url };
}

async function generateWithOpenRouter(
  input: GenerateImageSourceInput,
): Promise<ImageReference> {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    body: JSON.stringify({
      messages: [
        {
          content: input.prompt,
          role: "user",
        },
      ],
      modalities: ["image", "text"],
      model: OPENROUTER_IMAGE_MODEL,
      stream: false,
    }),
    headers: {
      Authorization: `Bearer ${requireOpenRouterKey()}`,
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
    throw new Error(
      `OpenRouter returned non-JSON response for ${input.assetId}: ${bodyText.slice(0, 400)}`,
    );
  }

  if (!response.ok) {
    const message =
      body && typeof body === "object" && "error" in body
        ? (body as { error?: { message?: string } }).error?.message
        : bodyText;
    throw new Error(
      `OpenRouter image generation failed for ${input.assetId}: ${message ?? bodyText}`,
    );
  }

  const image = extractImageReference(body);
  if (!image) {
    throw new Error(
      `OpenRouter response for ${input.assetId} did not include an image URL or data URL: ${bodyText.slice(0, 1200)}`,
    );
  }

  return image;
}

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

async function imageReferenceBuffer(
  reference: ImageReference,
  assetId: string,
): Promise<Buffer> {
  if (reference.b64Json) {
    return Buffer.from(reference.b64Json, "base64");
  }

  const url = reference.url;
  if (!url) throw new Error(`No image data found for ${assetId}.`);

  if (url.startsWith("data:image/")) {
    const [, base64] = url.split(",", 2);
    if (!base64) throw new Error(`Invalid data URL returned for ${assetId}.`);
    return Buffer.from(base64, "base64");
  }

  const imageResponse = await fetch(url);
  if (!imageResponse.ok) {
    throw new Error(`Failed to download image URL for ${assetId}: ${imageResponse.status}`);
  }

  return Buffer.from(await imageResponse.arrayBuffer());
}

function writeWebpCover(
  source: Buffer,
  outputPath: string,
  size: AssetSize,
  quality: number,
) {
  const tempDir = mkdtempSync(join(tmpdir(), "gravenhold-image-"));
  const sourcePath = join(tempDir, "source.image");
  const [width, height] = parseSize(size);

  try {
    writeFileSync(sourcePath, source);
    const result = spawnSync(
      "python",
      ["-", sourcePath, outputPath, String(width), String(height), String(quality)],
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
      throw new Error(`Failed to convert image to WebP. ${message}`);
    }
  } finally {
    rmSync(tempDir, { force: true, recursive: true });
  }

  readFileSync(outputPath);
}

function parseSize(size: AssetSize): [number, number] {
  const [rawWidth, rawHeight] = size.split("x");
  return [Number(rawWidth), Number(rawHeight)];
}

const webpCoverPython = String.raw`
from pathlib import Path
from PIL import Image
import sys

source = Path(sys.argv[1])
target = Path(sys.argv[2])
target_width = int(sys.argv[3])
target_height = int(sys.argv[4])
quality = int(sys.argv[5])
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
image.save(target, "WEBP", quality=quality, method=6, lossless=False)
`;

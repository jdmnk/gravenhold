import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

import { itemText } from "../../src/lib/rpgContent/generatedText";
import {
  IMAGE_QUALITY,
  OPENAI_API_KEY,
} from "./lib/env";

const rootDir = process.cwd();
const openAiModel =
  process.env.OPENAI_IMAGE_MODEL ?? process.env.IMAGE_MODEL ?? "gpt-image-1";
const openRouterImageModel =
  process.env.OPENROUTER_IMAGE_MODEL ?? "openai/gpt-5-image-mini";
const generatedSize =
  process.env.OPENAI_ITEM_IMAGE_SIZE ??
  process.env.OPENROUTER_ITEM_IMAGE_SIZE ??
  process.env.OPENAI_IMAGE_SIZE ??
  process.env.OPENROUTER_IMAGE_SIZE ??
  "1024x1024";
const generatedQuality =
  process.env.OPENAI_IMAGE_QUALITY ??
  process.env.OPENROUTER_IMAGE_QUALITY ??
  IMAGE_QUALITY ??
  "medium";
const outputSize = Number(process.env.ITEM_ICON_OUTPUT_SIZE ?? 128);
const outputQuality = Number(process.env.ITEM_ICON_WEBP_QUALITY ?? 82);
const sourceFormat = "png";

const outputDir = path.join(rootDir, "public", "assets", "game", "items");
const tempDir = path.join(rootDir, ".dev", "generated-item-icons");
const promptDir = path.join(
  rootDir,
  "scripts",
  "generate-assets",
  "generated-prompts",
  "items",
);

const itemIconStyle = [
  "Create one transparent-background inventory item icon for Gravenhold, a deterministic old-school fantasy progression RPG.",
  "The image must look like hand-authored low-resolution fantasy game item art: chunky readable silhouette, hard painterly pixel edges, visible dithering, worn materials, no smooth modern rendering.",
  "Make the item exciting and collectible at inventory scale: strong material definition, crisp highlights, readable contrast, and one or two tasteful medieval accent colors.",
  "Use rich but grounded medieval fantasy colors: polished brass, warm gold, tempered steel, crimson leather, deep forest green cloth, sapphire blue enamel, teal glass, amethyst crystal, ivory bone, ember orange, or moonlit silver as appropriate to the item.",
  "Do not make the item monochrome gray, muddy, dull, or low-contrast. Avoid rainbow colors, neon cyberpunk color, candy colors, plastic shine, and excessive magical glow.",
  "Transparent background only. No stone, wood, parchment, gradient, glow field, vignette, floor, frame, UI slot, border, label, readable text, hands, characters, or scene context.",
  "Show exactly one centered equipment pickup object with generous transparent padding on all sides so it fits inside a square inventory slot.",
  "Use the same visual language for every item: 3/4 top-down inventory angle, upper-left warm torch highlight, clear lower-right shadow pixels, medieval mountain-fortress fantasy palette, small readable details, no photorealism, no modern 3D render.",
  `The final runtime icon will be downscaled to ${outputSize}x${outputSize}; keep the object readable at 48x48 pixels.`,
  "Do not imitate or reference RuneScape, OSRS, Diablo, or any specific existing game asset.",
].join(" ");

const optimizePython = String.raw`
from collections import deque
from pathlib import Path
from PIL import Image
import sys

source = Path(sys.argv[1])
target = Path(sys.argv[2])
size = int(sys.argv[3])
quality = int(sys.argv[4])
threshold = 180
resample = getattr(getattr(Image, "Resampling", Image), "LANCZOS")

image = Image.open(source).convert("RGBA")
pixels = image.load()
width, height = image.size
seen = set()
queue = deque()

for x in range(width):
    queue.append((x, 0))
    queue.append((x, height - 1))
for y in range(height):
    queue.append((0, y))
    queue.append((width - 1, y))

while queue:
    x, y = queue.popleft()
    if (x, y) in seen:
        continue
    seen.add((x, y))
    r, g, b, a = pixels[x, y]
    if a > threshold:
        continue
    if a != 0:
        pixels[x, y] = (r, g, b, 0)
    if x > 0:
        queue.append((x - 1, y))
    if x + 1 < width:
        queue.append((x + 1, y))
    if y > 0:
        queue.append((x, y - 1))
    if y + 1 < height:
        queue.append((x, y + 1))

image.thumbnail((size, size), resample)
canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
canvas.alpha_composite(image, ((size - image.width) // 2, (size - image.height) // 2))
target.parent.mkdir(parents=True, exist_ok=True)
canvas.save(target, "WEBP", quality=quality, method=6, lossless=False)
`;

type ItemIconAsset = {
  description: string;
  id: string;
  name: string;
};

type ImageProvider = "openai" | "openrouter";

type ImageReference = {
  b64Json?: string;
  url?: string;
};

function itemAssets(): ItemIconAsset[] {
  return Object.values(itemText).map((item) => ({
    description: item.description,
    id: item.id.replaceAll("_", "-"),
    name: item.name,
  }));
}

function getArg(name: string): string | null {
  const index = process.argv.findIndex((arg) => arg === name);
  if (index === -1) return null;
  return process.argv[index + 1] ?? "";
}

function selectedAssetIds(): Set<string> | null {
  const singleAsset = getArg("--asset");
  const raw = singleAsset ?? getArg("--assets");
  if (!raw) return null;

  return new Set(
    raw
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
  );
}

function shouldForce(): boolean {
  return process.argv.includes("--force");
}

function shouldWritePromptsOnly(): boolean {
  return process.argv.includes("--write-prompts-only");
}

function shouldListAssets(): boolean {
  return process.argv.includes("--list");
}

function imageProvider(): ImageProvider {
  const rawProvider =
    getArg("--provider") ?? process.env.ITEM_ICON_IMAGE_PROVIDER ?? "openai";
  if (rawProvider === "openai" || rawProvider === "openrouter") {
    return rawProvider;
  }

  throw new Error(
    `Unsupported image provider "${rawProvider}". Use "openai" or "openrouter".`,
  );
}

function printUsage() {
  console.log(
    `
Usage: jiti scripts/generate-assets/generate-transparent-item-icons.ts [options]

Options:
  --list                 Print valid inventory item ids
  --asset <id>           Generate one inventory item id
  --assets <id,id>       Generate a comma-separated list of item ids
  --provider <provider>  Image backend: openai or openrouter, default openai
  --force                Regenerate existing WebPs
  --write-prompts-only   Write prompt files without API calls
  --help, -h             Show this help

Environment:
  OPENAI_ITEM_IMAGE_SIZE     Source generation size, default ${generatedSize}
  OPENROUTER_API_KEY         OpenRouter key used with --provider openrouter
  OPENROUTER_IMAGE_MODEL     OpenRouter image model, default ${openRouterImageModel}
  ITEM_ICON_OUTPUT_SIZE      Final WebP dimensions, default ${outputSize}
  ITEM_ICON_WEBP_QUALITY     Final WebP quality, default ${outputQuality}

Examples:
  npm run generate:transparent-items -- --list
  npm run generate:transparent-items -- --write-prompts-only
  npm run generate:transparent-items -- --asset iron-gauntlets --force
`.trim(),
  );
}

function makePrompt(asset: ItemIconAsset): string {
  return [
    itemIconStyle,
    `Item name: ${asset.name}.`,
    `Item request: ${asset.description}.`,
    "Keep this icon stylistically consistent with the rest of the Gravenhold inventory set.",
  ].join(" ");
}

async function generateAsset(
  provider: ImageProvider,
  apiKey: string,
  asset: ItemIconAsset,
) {
  const prompt = makePrompt(asset);
  const outputPath = path.join(outputDir, `${asset.id}.webp`);
  const sourcePath = path.join(tempDir, `${asset.id}.source.png`);
  const promptPath = path.join(promptDir, `${asset.id}.prompt.txt`);

  mkdirSync(outputDir, { recursive: true });
  mkdirSync(tempDir, { recursive: true });

  if (shouldWritePromptsOnly()) {
    mkdirSync(promptDir, { recursive: true });
    writeFileSync(promptPath, `${prompt}\n`);
    console.log(`prompt ${asset.id}: ${path.relative(rootDir, promptPath)}`);
    return;
  }

  if (!shouldForce() && existsSync(outputPath)) {
    console.log(
      `skip ${asset.id}: ${path.relative(rootDir, outputPath)} already exists`,
    );
    return;
  }

  console.log(`generate ${asset.id}: ${asset.name}`);

  try {
    await generateSourceImage(provider, apiKey, asset.id, prompt, sourcePath);
    optimizeIcon(sourcePath, outputPath);
  } finally {
    rmSync(sourcePath, { force: true });
  }

  console.log(`wrote ${path.relative(rootDir, outputPath)}`);
}

async function generateSourceImage(
  provider: ImageProvider,
  apiKey: string,
  assetId: string,
  prompt: string,
  sourcePath: string,
) {
  const reference =
    provider === "openrouter"
      ? await generateWithOpenRouter(apiKey, assetId, prompt)
      : await generateWithOpenAi(apiKey, assetId, prompt);

  await writeImageReference(reference, assetId, sourcePath);
}

async function generateWithOpenAi(
  apiKey: string,
  assetId: string,
  prompt: string,
): Promise<ImageReference> {
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    body: JSON.stringify({
      background: "transparent",
      model: openAiModel,
      output_format: sourceFormat,
      prompt,
      quality: generatedQuality,
      size: generatedSize,
    }),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  const bodyText = await response.text();
  let body: unknown;

  try {
    body = JSON.parse(bodyText);
  } catch {
    throw new Error(
      `OpenAI returned non-JSON response for ${assetId}: ${bodyText.slice(0, 400)}`,
    );
  }

  if (!response.ok) {
    const message =
      body && typeof body === "object" && "error" in body
        ? (body as { error?: { message?: string } }).error?.message
        : bodyText;
    throw new Error(
      `OpenAI image generation failed for ${assetId}: ${message ?? bodyText}`,
    );
  }

  const image =
    body && typeof body === "object" && "data" in body
      ? (body as { data?: Array<{ b64_json?: string; url?: string }> }).data?.[0]
      : null;

  if (!image?.b64_json && !image?.url) {
    throw new Error(
      `OpenAI response for ${assetId} did not include b64_json or url.`,
    );
  }

  return { b64Json: image.b64_json, url: image.url };
}

async function generateWithOpenRouter(
  apiKey: string,
  assetId: string,
  prompt: string,
): Promise<ImageReference> {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    body: JSON.stringify({
      messages: [
        {
          content: prompt,
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
      "X-Title": "Gravenhold Item Icon Generator",
    },
    method: "POST",
  });

  const bodyText = await response.text();
  let body: unknown;

  try {
    body = JSON.parse(bodyText);
  } catch {
    throw new Error(
      `OpenRouter returned non-JSON response for ${assetId}: ${bodyText.slice(0, 400)}`,
    );
  }

  if (!response.ok) {
    const message =
      body && typeof body === "object" && "error" in body
        ? (body as { error?: { message?: string } }).error?.message
        : bodyText;
    throw new Error(
      `OpenRouter image generation failed for ${assetId}: ${message ?? bodyText}`,
    );
  }

  const image = extractImageReference(body);
  if (!image) {
    throw new Error(
      `OpenRouter response for ${assetId} did not include an image URL or data URL: ${bodyText.slice(0, 1200)}`,
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
    if (typeof imageUrl === "string") {
      return { url: imageUrl };
    }
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
    } else if (
      typeof nested === "string" &&
      nested.startsWith("data:image/")
    ) {
      return { url: nested };
    }
  }

  return null;
}

async function writeImageReference(
  reference: ImageReference,
  assetId: string,
  sourcePath: string,
) {
  const url = reference.url;
  if (reference.b64Json) {
    writeFileSync(sourcePath, Buffer.from(reference.b64Json, "base64"));
    return;
  }

  if (!url) {
    throw new Error(`No image data found for ${assetId}.`);
  }

  if (url.startsWith("data:image/")) {
    const [, base64] = url.split(",", 2);
    if (!base64) {
      throw new Error(`Invalid data URL returned for ${assetId}.`);
    }
    writeFileSync(sourcePath, Buffer.from(base64, "base64"));
    return;
  }

  const imageResponse = await fetch(url);
  if (!imageResponse.ok) {
    throw new Error(`Failed to download image URL for ${assetId}.`);
  }
  writeFileSync(sourcePath, Buffer.from(await imageResponse.arrayBuffer()));
}

function optimizeIcon(sourcePath: string, outputPath: string) {
  const result = spawnSync(
    "python",
    ["-", sourcePath, outputPath, String(outputSize), String(outputQuality)],
    {
      encoding: "utf8",
      input: optimizePython,
      maxBuffer: 1024 * 1024,
    },
  );

  if (result.status !== 0) {
    throw new Error(
      [
        `Failed to optimize ${path.basename(sourcePath)}.`,
        result.stderr.trim(),
        result.stdout.trim(),
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }
}

async function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    printUsage();
    return;
  }

  const assets = itemAssets();

  if (shouldListAssets()) {
    console.log(assets.map((asset) => asset.id).join("\n"));
    return;
  }

  const selectedIds = selectedAssetIds();
  const targets = assets.filter(
    (asset) => !selectedIds || selectedIds.has(asset.id),
  );

  if (targets.length === 0) {
    throw new Error(
      "No matching inventory item assets selected. Run with --list to see valid ids.",
    );
  }

  const provider = imageProvider();
  const apiKey =
    provider === "openrouter"
      ? process.env.OPENROUTER_API_KEY ?? process.env.openrouter_api_key ?? ""
      : OPENAI_API_KEY ??
        process.env.openai_api_key ??
        process.env.OpenAI_API_Key ??
        "";

  if (!apiKey && !shouldWritePromptsOnly()) {
    throw new Error(
      provider === "openrouter"
        ? "Missing OpenRouter API key. Add OPENROUTER_API_KEY to .env, or use --write-prompts-only."
        : "Missing OpenAI API key. Add OPENAI_API_KEY or openai_api_key to .env, or use --write-prompts-only.",
    );
  }

  console.log(
    `provider=${provider} model=${provider === "openrouter" ? openRouterImageModel : openAiModel} source=${generatedSize} sourceQuality=${generatedQuality} output=${outputSize} webpQuality=${outputQuality} assets=${targets.length}`,
  );
  console.log(`images=${path.relative(rootDir, outputDir)}`);
  console.log(`prompts=${path.relative(rootDir, promptDir)}`);

  for (const asset of targets) {
    await generateAsset(provider, apiKey, asset);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

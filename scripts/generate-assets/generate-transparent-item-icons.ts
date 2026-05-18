import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

import { itemText } from "../../src/lib/rpgContent/generatedText";
import { IMAGE_QUALITY } from "./lib/env";
import {
  generateImageSource,
  imageModel,
  imageProvider as resolveImageProvider,
  type ImageProvider,
} from "./lib/llm-image-client";
import type { AssetSize } from "./lib/types";

const rootDir = process.cwd();
const generatedSize =
  process.env.ITEM_ICON_IMAGE_SIZE ??
  "1024x1024";
const generatedQuality =
  process.env.ITEM_ICON_IMAGE_QUALITY ??
  IMAGE_QUALITY;
const outputSize = Number(process.env.ITEM_ICON_OUTPUT_SIZE ?? 128);
const outputQuality = Number(process.env.ITEM_ICON_WEBP_QUALITY ?? 82);
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
    getArg("--provider") ?? process.env.ITEM_ICON_IMAGE_PROVIDER;
  return resolveImageProvider(rawProvider);
}

function printUsage() {
  console.log(
    `
Usage: jiti scripts/generate-assets/generate-transparent-item-icons.ts [options]

Options:
  --list                 Print valid inventory item ids
  --asset <id>           Generate one inventory item id
  --assets <id,id>       Generate a comma-separated list of item ids
  --provider <provider>  Image backend: openrouter or openai, default openrouter
  --force                Regenerate existing WebPs
  --write-prompts-only   Write prompt files without API calls
  --help, -h             Show this help

Environment:
  ITEM_ICON_IMAGE_SIZE       Source generation size, default ${generatedSize}
  ITEM_ICON_IMAGE_QUALITY    Source generation quality label, default ${generatedQuality}
  OPENROUTER_API_KEY         OpenRouter key used with --provider openrouter
  OPENROUTER_IMAGE_MODEL     OpenRouter image model, default openai/gpt-5-image-mini
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
    await generateSourceImage(provider, asset.id, prompt, sourcePath);
    optimizeIcon(sourcePath, outputPath);
  } finally {
    rmSync(sourcePath, { force: true });
  }

  console.log(`wrote ${path.relative(rootDir, outputPath)}`);
}

async function generateSourceImage(
  provider: ImageProvider,
  assetId: string,
  prompt: string,
  sourcePath: string,
) {
  const source = await generateImageSource({
    assetId,
    prompt,
    provider,
    size: generatedSize as AssetSize,
    transparent: true,
  });
  writeFileSync(sourcePath, source);
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
  console.log(
    `provider=${provider} model=${imageModel(provider)} source=${generatedSize} sourceQuality=${generatedQuality} output=${outputSize} webpQuality=${outputQuality} assets=${targets.length}`,
  );
  console.log(`images=${path.relative(rootDir, outputDir)}`);
  console.log(`prompts=${path.relative(rootDir, promptDir)}`);

  for (const asset of targets) {
    await generateAsset(provider, asset);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

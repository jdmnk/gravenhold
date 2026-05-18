import { existsSync } from "node:fs";
import { resolve } from "node:path";

import manifest from "./data/images.json";
import {
  IMAGE_CATEGORIES,
  type AssetManifest,
  type ImageAssetDef,
  type ImageCategory,
} from "./lib/types";
import {
  IMAGE_QUALITY,
  MAX_CONCURRENCY,
  REQUEST_DELAY_MS,
} from "./lib/env";
import {
  imageModel,
  imageProvider,
  type ImageProvider,
} from "./lib/llm-image-client";
import { buildPrompt } from "./lib/prompts";

const OUTPUT_ROOT = resolve(__dirname, "../../public/assets/game");

type CliOptions = {
  category: ImageCategory | null;
  dryRun: boolean;
  force: boolean;
  id: string | null;
  provider: ImageProvider;
};

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const opts: CliOptions = {
    category: null,
    dryRun: false,
    force: false,
    id: null,
    provider: imageProvider(),
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--dry-run") {
      opts.dryRun = true;
    } else if (arg === "--force") {
      opts.force = true;
    } else if ((arg === "--category" || arg === "--asset") && args[index + 1]) {
      const category = args[index + 1] as ImageCategory;
      if (!IMAGE_CATEGORIES.includes(category)) {
        throw new Error(`Unknown category ${category}. Valid: ${IMAGE_CATEGORIES.join(", ")}`);
      }
      opts.category = category;
      index += 1;
    } else if (arg === "--id" && args[index + 1]) {
      opts.id = args[index + 1];
      index += 1;
    } else if (arg === "--provider" && args[index + 1]) {
      opts.provider = imageProvider(args[index + 1]);
      index += 1;
    } else if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument ${arg}. Run with --help.`);
    }
  }

  return opts;
}

function printUsage() {
  console.log(`
Usage: jiti scripts/generate-assets/generate-images.ts [options]

Options:
  --dry-run               Print planned assets and prompts without API calls
  --category <category>   Generate one category: ${IMAGE_CATEGORIES.join(", ")}
  --id <asset-id>         Generate one asset by id
  --provider <provider>   Image backend: openrouter or openai, default openrouter
  --force                 Regenerate existing files
  --help, -h              Show this help

Examples:
  npm run generate:images -- --dry-run
  npm run generate:images -- --id fallen-gate
  npm run generate:images -- --id level-cleared --provider openrouter
  npm run generate:images -- --category items --force
`.trim());
}

function collectAssets(opts: CliOptions): ImageAssetDef[] {
  const typed = manifest as AssetManifest;
  const categories = opts.category ? [opts.category] : IMAGE_CATEGORIES;
  const assets = categories.flatMap((category) => typed[category] ?? []);

  if (!opts.id) return assets;

  const matched = assets.filter((asset) => asset.id === opts.id);
  if (matched.length === 0) {
    throw new Error(`Unknown asset id ${opts.id}. Available: ${assets.map((asset) => asset.id).join(", ")}`);
  }
  return matched;
}

function outputPath(asset: ImageAssetDef): string {
  return resolve(OUTPUT_ROOT, asset.category, asset.filename);
}

async function processAsset(asset: ImageAssetDef, opts: CliOptions): Promise<boolean> {
  const out = outputPath(asset);
  const prompt = buildPrompt(asset);

  if (!opts.force && existsSync(out)) {
    console.log(`  SKIP  ${asset.category}/${asset.filename}`);
    return false;
  }

  if (opts.dryRun) {
    console.log(`  PLAN  ${asset.category}/${asset.filename}`);
    console.log(`        ${asset.size} ${asset.format}`);
    console.log(`        ${prompt}`);
    return false;
  }

  console.log(`  GEN   ${asset.category}/${asset.filename} (${asset.size})`);
  const { generateImage } = await import("./lib/llm-image-client");
  await generateImage({
    format: asset.format,
    outputPath: out,
    prompt,
    provider: opts.provider,
    size: asset.size,
    transparent: asset.transparent,
  });
  console.log(`  DONE  ${asset.category}/${asset.filename}`);
  return true;
}

async function run() {
  const opts = parseArgs();
  const assets = collectAssets(opts);
  let generated = 0;
  let skipped = 0;

  console.log("");
  console.log("Gravenhold Image Generator");
  console.log(`  queued: ${assets.length}${opts.dryRun ? " (dry run)" : ""}`);
  console.log(`  output: ${OUTPUT_ROOT}`);
  console.log(`  model:  ${imageModel(opts.provider)}`);
  console.log(`  provider: ${opts.provider}`);
  console.log(`  quality: ${IMAGE_QUALITY}`);
  console.log("");

  for (let index = 0; index < assets.length; index += MAX_CONCURRENCY) {
    const batch = assets.slice(index, index + MAX_CONCURRENCY);
    const results = await Promise.allSettled(batch.map((asset) => processAsset(asset, opts)));

    for (const result of results) {
      if (result.status === "fulfilled") {
        if (result.value) generated += 1;
        else skipped += 1;
      } else {
        console.error(`  FAIL  ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`);
      }
    }

    if (!opts.dryRun && index + MAX_CONCURRENCY < assets.length) {
      await sleep(REQUEST_DELAY_MS);
    }
  }

  console.log("");
  console.log(`Complete: ${generated} generated, ${skipped} skipped`);
}

function sleep(ms: number) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

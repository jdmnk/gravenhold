import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { generatePixellabUi } from "./lib/pixellab-client";

type UiAssetId = "agility" | "intellect" | "spirit" | "strength";

type UiAssetPreset = {
  colorPalette: string;
  description: string;
  height: number;
  outputPath: string;
  seed: number;
  width: number;
};

const OUTPUT_ROOT = resolve(__dirname, "../../public/assets/game/ui/generated");

const SHARED_STYLE = [
  "dark fantasy old-school RPG pixel art UI",
  "monochrome low saturation icon",
  "gray brown flat palette",
  "carved stone, dull iron, aged leather, bone, and tarnished bronze",
  "chunky readable silhouette",
  "sharp pixel edges",
  "flat shaded pixel clusters",
  "small warm amber edge highlights only",
  "no saturated color",
  "no purple",
  "no violet",
  "no blue glow",
  "no neon",
  "no jewel tones",
  "no colorful magical aura",
  "transparent background",
  "no text",
  "no letters",
  "no numbers",
  "no watermark",
].join(", ");

const UI_ASSETS: Record<UiAssetId, UiAssetPreset> = {
  agility: {
    colorPalette:
      "charcoal black, ash gray, dark umber leather, dull iron, tarnished bronze, bone beige, tiny amber highlights",
    description: [
      "agility stat icon",
      "single centered running human figure silhouette",
      "lean forward sprint pose with one arm forward and one leg extended",
      "compact square game UI glyph",
      "speed precision stealth fantasy",
      "simple enough to read at 32 pixels",
      SHARED_STYLE,
    ].join(", "),
    height: 64,
    outputPath: resolve(OUTPUT_ROOT, "agility-icon.png"),
    seed: 73103,
    width: 64,
  },
  intellect: {
    colorPalette:
      "charcoal black, ash gray, parchment beige, dull iron, tarnished bronze, bone ivory, tiny amber highlights",
    description: [
      "intellect stat icon",
      "single centered open weathered book with a small carved eye symbol above it",
      "compact square game UI glyph",
      "knowledge reasoning tactical mind fantasy",
      "simple enough to read at 32 pixels",
      SHARED_STYLE,
    ].join(", "),
    height: 64,
    outputPath: resolve(OUTPUT_ROOT, "intellect-icon.png"),
    seed: 73102,
    width: 64,
  },
  spirit: {
    colorPalette:
      "charcoal black, ash gray, smoky taupe, dull iron, tarnished bronze, bone beige, tiny amber highlights",
    description: [
      "spirit stat icon",
      "single centered eight-point prayer star sigil",
      "radiant compass-star shape carved from dull bone and tarnished bronze",
      "compact square game UI glyph",
      "willpower empathy mystic resistance fantasy",
      "simple enough to read at 32 pixels",
      SHARED_STYLE,
    ].join(", "),
    height: 64,
    outputPath: resolve(OUTPUT_ROOT, "spirit-icon.png"),
    seed: 73104,
    width: 64,
  },
  strength: {
    colorPalette:
      "charcoal black, ash gray, dark umber, worn iron, tarnished bronze, bone beige, tiny amber highlights",
    description: [
      "strength stat icon",
      "single centered clenched fist",
      "compact square game UI glyph",
      "heavy physical power fantasy",
      "simple enough to read at 32 pixels",
      SHARED_STYLE,
    ].join(", "),
    height: 64,
    outputPath: resolve(OUTPUT_ROOT, "strength-icon.png"),
    seed: 73101,
    width: 64,
  },
};

type CliOptions = {
  asset: UiAssetId;
  dryRun: boolean;
  forcePrompt: string | null;
  force: boolean;
  height: number | null;
  mode: "pixflux" | "ui-pro";
  outputPath: string | null;
  seed: number | null;
  width: number | null;
};

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const opts: CliOptions = {
    asset: "strength",
    dryRun: false,
    forcePrompt: null,
    force: false,
    height: null,
    mode: "pixflux",
    outputPath: null,
    seed: null,
    width: null,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = args[index + 1];

    if (arg === "--asset" && next) {
      if (!isUiAssetId(next)) {
        throw new Error(
          `Unknown UI asset "${next}". Valid: ${Object.keys(UI_ASSETS).join(", ")}`,
        );
      }
      opts.asset = next;
      index += 1;
    } else if (arg === "--dry-run") {
      opts.dryRun = true;
    } else if (arg === "--force") {
      opts.force = true;
    } else if (arg === "--height" && next) {
      opts.height = Number(next);
      index += 1;
    } else if (arg === "--out" && next) {
      opts.outputPath = resolve(process.cwd(), next);
      index += 1;
    } else if (arg === "--prompt" && next) {
      opts.forcePrompt = next;
      index += 1;
    } else if (arg === "--pro-ui") {
      opts.mode = "ui-pro";
    } else if (arg === "--seed" && next) {
      opts.seed = Number(next);
      index += 1;
    } else if (arg === "--width" && next) {
      opts.width = Number(next);
      index += 1;
    } else if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument "${arg}". Run with --help.`);
    }
  }

  return opts;
}

function printUsage() {
  console.log(
    `
Usage: jiti scripts/generate-assets/generate-pixellab-ui.ts [options]

Options:
  --asset <id>      UI asset preset to generate: ${Object.keys(UI_ASSETS).join(", ")}
  --dry-run         Print the PixelLab payload without calling the API
  --force           Regenerate even when the output file already exists
  --height <px>     Override preset height
  --out <path>      Override output path
  --pro-ui          Use PixelLab Create UI Elements Pro; expensive, 64px costs 20 generations
  --prompt <text>   Override preset prompt
  --seed <number>   Override preset seed
  --width <px>      Override preset width
  --help, -h        Show this help

Examples:
  npm run generate:pixellab-ui -- --dry-run
  npm run generate:pixellab-ui -- --asset strength --seed 42
  npm run generate:pixellab-ui -- --asset strength --pro-ui --force
`.trim(),
  );
}

async function run() {
  const opts = parseArgs();
  const preset = UI_ASSETS[opts.asset];
  const description = opts.forcePrompt ?? preset.description;
  const height = opts.height ?? preset.height;
  const outputPath = opts.outputPath ?? preset.outputPath;
  const seed = opts.seed ?? preset.seed;
  const width = opts.width ?? preset.width;

  const payload = {
    colorPalette: preset.colorPalette,
    description,
    height,
    mode: opts.mode,
    outputPath,
    seed,
    transparent: true,
    width,
  };

  if (opts.dryRun) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  if (!opts.force && existsSync(outputPath)) {
    console.log(`Skipping existing PixelLab UI asset: ${outputPath}`);
    console.log("Pass --force to spend another generation and overwrite it.");
    return;
  }

  console.log(`Generating PixelLab UI asset: ${opts.asset}`);
  console.log(`  output: ${outputPath}`);
  console.log(`  size:   ${width}x${height}`);
  console.log(`  seed:   ${seed}`);
  console.log(
    `  mode:   ${opts.mode}${opts.mode === "ui-pro" ? " (expensive Pro grid)" : ""}`,
  );

  await generatePixellabUi({
    ...payload,
    onStatus: (message) => console.log(`  ${message}`),
  });
  console.log(`Done: ${outputPath}`);
}

function isUiAssetId(value: string): value is UiAssetId {
  return Object.prototype.hasOwnProperty.call(UI_ASSETS, value);
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

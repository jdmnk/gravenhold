import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { encounterText } from "../../src/lib/rpgContent/generatedText";

type EncounterPromptNote = {
  scene: string;
  subject: string;
};

type CliOptions = {
  format: "markdown" | "text";
  ids: number[];
  out: string | null;
};

const DEFAULT_FROM_ID = 1;
const DEFAULT_COUNT = 5;

const STYLE =
  "early 1990s VGA horror RPG pixel art, low-resolution painted pixel look, chunky pixels, visible hand dithering, limited muted palette, black/brown/gray/dirty moss tones, grim dark fantasy atmosphere, old PC adventure/RPG background feel.";

const COMPOSITION =
  "wide 3:2 scene, no UI, no text, no foreground hero, leave readable top-center space for overlay title.";

const AVOID =
  "photorealism, modern concept art, smooth gradients, anime, cartoon, 3D render, clean high-fantasy polish, watermark, logos, readable text.";

const encounterPromptNotes: Record<number, EncounterPromptNote> = {
  1: {
    scene:
      "A ruined stone gate blocks a muddy valley road after cold rain. Mossy broken blocks, warped iron bars, fallen beam, distant grey hills, wet ground, dead weeds, cold mist, faint amber torch remnants.",
    subject:
      "The fallen gate dominates the center, making the road blockage clear without showing a hero.",
  },
  2: {
    scene:
      "A steep hillside path has turned into sliding mud under cold rain. Broken roots, slick stones, churned brown earth, low mist, drainage lines cutting through the slope, dangerous narrow footing.",
    subject:
      "The unstable mud path is the focal point, with the upward route still visible through the hazard.",
  },
  3: {
    scene:
      "A nervous border outpost stands on a muddy road. Crude wooden checkpoint, worn banners, spear racks, watchfire smoke, low stone wall, distant valley pass, grey-green wilderness.",
    subject:
      "The guarded checkpoint blocks the route. A guard may appear only as a small shadowy figure, not a portrait.",
  },
  4: {
    scene:
      "A forgotten stone marker hums beside an old road. Carved symbols, tilted monolith, moss, cracked paving, small stones arranged like instructions, cold mist, dead grass, dim occult glow.",
    subject:
      "The speaking marker is the central object, large enough to read as an ancient directional puzzle but without readable text.",
  },
  5: {
    scene:
      "A tense clearing before the first guardian's outpost. Shield-marked standing stones, crude watchfires, trampled dirt, dead brush, black trees, distant stone approach, scout shadows at the edges.",
    subject:
      "Guardian scouts are implied by silhouettes and shadows around the clearing, with the approach route still visible.",
  },
  6: {
    scene:
      "A broken stone-and-wood bridge hangs over a black ravine. Splintered planks, snapped ropes, crumbling stone supports, mist rising from the abyss, dead trees clinging to cliff edges.",
    subject:
      "The collapsed bridge and terrifying ravine are the focal point, with a dangerous partial crossing visible.",
  },
  7: {
    scene:
      "An ancient sealed archive door in a buried stone corridor. Heavy circular locking wheels, worn inscriptions, carved sequence symbols, dust, cracked masonry, narrow shafts of cold light, old mechanisms half exposed.",
    subject:
      "The sealed archive door dominates the center, with the locking sequence mechanism clearly visible but no readable text.",
  },
  8: {
    scene:
      "A violent dust storm swallows a barren road, erasing every landmark. Sand and ash sweep across cracked earth, half-buried stones, vague silhouettes of ruined posts, dim sun hidden behind brown-gray haze.",
    subject:
      "The road disappears into the storm as the central focal path, with swirling dust dominating the scene.",
  },
  9: {
    scene:
      "A trapped caravan camp on a dark road, with broken wagons, covered crates, torn canvas, nervous lantern light, mud, dead brush, and a hidden ominous detail among the supplies.",
    subject:
      "The damaged caravan and suspicious leader's camp are the focal point. Human figures may appear only as small shadowy silhouettes, not portraits.",
  },
  10: {
    scene:
      "A dark wooded approach to an ancient second gate. Black trees, ruined stones, fog, narrow path, scattered bones or broken arrows, distant gate silhouette barely visible.",
    subject:
      "Several silent hunter silhouettes hide in the midground shadows, watching from trees and ruins, threatening but not close-up.",
  },
  11: {
    scene:
      "A sheer cliff face rises into a stormy high pass. Rusted iron spikes have been hammered into the rock as a brutal ladder, with loose chains, old blood-dark stains, broken handholds, fog below, and cold mountain wind.",
    subject:
      "The spike ladder climbs through the center of the image, making the dangerous vertical route clear without showing a climber.",
  },
  12: {
    scene:
      "An old stone hall lined with tarnished mirrors, cracked black floor tiles, warped reflections, dusty candelabra, broken frames, and a dim corridor vanishing between impossible reflected paths.",
    subject:
      "The mirror hall itself is the threat, with several reflections implying false routes but no readable symbols or modern glass shine.",
  },
  13: {
    scene:
      "A mountain pass filled with poisonous green-gray mist rising from cracked vents. Jagged rocks, corroded metal grates, dead moss, wet stone, bubbling fissures, and faint skull-like shapes hidden in the vapor.",
    subject:
      "The vent field and choking mist dominate the center, with a narrow survivable route barely visible through the haze.",
  },
  14: {
    scene:
      "A divided mountain camp blocks the road. Two hostile clusters of tents and barricades face each other across a muddy gap, with cold campfires, stacked supplies, spear shadows, torn flags, and suspicious silhouettes.",
    subject:
      "The split camp composition should clearly show conflict and the blocked passage, with people only as small shadowy figures.",
  },
  15: {
    scene:
      "The mountain gate stands ahead under dark clouds, guarded by the third guardian's vanguard. Shield walls, stone steps, black banners, cold braziers, broken statues, and a narrow approach hemmed by cliffs.",
    subject:
      "The vanguard formation blocks the gate in the midground, threatening and organized, with no close-up character portrait.",
  },
  16: {
    scene:
      "A frozen stair climbs through thin mountain air, built from ancient stone steps glazed in black ice. Falling icicles, windblown snow, broken rail posts, blue-gray frost, cliff void below, and distant storm clouds.",
    subject:
      "The icy stairway rises through the center as the clear obstacle, dangerous and narrow, with no traveler visible.",
  },
  17: {
    scene:
      "A locked mountaintop observatory turns beneath a starless storm sky. Huge bronze gears, rotating lens rings, cracked telescope housing, astrolabe machinery, dark stone floor, cold starlight, dust and frost on the mechanisms.",
    subject:
      "The rotating observatory mechanism and aligned lenses dominate the scene, clearly reading as a star puzzle without readable labels.",
  },
  18: {
    scene:
      "A narrow cliff path bends beside an impossible storm climbing upward from the abyss. Vertical lightning, rain pulled skyward, torn banners, slick rock, floating debris, black clouds below and above.",
    subject:
      "The upward storm is the central threat, with the cliff path still visible as a thin route through it.",
  },
  19: {
    scene:
      "The last pilgrims wait before the final road in a bleak high pass. Hooded silhouettes, old packs, prayer stones, extinguished lanterns, wind-carved rock, worn banners, and a solemn road vanishing toward the final gate.",
    subject:
      "The pilgrim group frames the passage ahead, judging the route, but figures stay small and shadowy rather than portrait-like.",
  },
  20: {
    scene:
      "The final gate stands at the end of the world, gathering motifs from prior trials: broken stone, ice, dust, mirrors, old sigils, shield fragments, and storm clouds around a colossal sealed doorway.",
    subject:
      "The final gate is massive and centered, ominous and closed, with layered trial relics around it and no readable text.",
  },
};

function buildEncounterBackgroundPrompt(encounterId: number): string {
  const encounter = encounterText[encounterId];
  if (!encounter) {
    throw new Error(`Unknown encounter id ${encounterId}.`);
  }

  const note = encounterPromptNotes[encounterId] ?? fallbackPromptNote(encounterId);

  return [
    "Use case: stylized-concept",
    "Asset type: 1536x1024 game scene background for a deterministic RPG encounter.",
    `Primary request: Create an original retro pixel-art scene background for the encounter "${encounter.title}".`,
    `Scene/backdrop: ${note.scene}`,
    `Subject: ${note.subject}`,
    `Style: ${STYLE}`,
    `Composition: ${COMPOSITION}`,
    `Avoid: ${AVOID}`,
  ].join("\n");
}

function fallbackPromptNote(encounterId: number): EncounterPromptNote {
  const encounter = encounterText[encounterId];

  return {
    scene:
      `${encounter.description} Build the environment directly around this obstacle, using props and terrain that make the encounter understandable at a glance. Include no readable text.`,
    subject:
      `The focal point should clearly communicate "${encounter.title}" as the main obstacle or situation, without showing a foreground player character.`,
  };
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  let from = DEFAULT_FROM_ID;
  let count = DEFAULT_COUNT;
  let explicitIds: number[] | null = null;
  const opts: CliOptions = {
    format: "markdown",
    ids: [],
    out: null,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = args[index + 1];

    if (arg === "--ids" && next) {
      explicitIds = parseIds(next);
      index += 1;
    } else if (arg === "--from" && next) {
      from = parsePositiveInt(next, "--from");
      index += 1;
    } else if (arg === "--count" && next) {
      count = parsePositiveInt(next, "--count");
      index += 1;
    } else if (arg === "--format" && next) {
      if (next !== "markdown" && next !== "text") {
        throw new Error(`Unknown format "${next}". Valid: markdown, text.`);
      }
      opts.format = next;
      index += 1;
    } else if (arg === "--out" && next) {
      opts.out = resolve(process.cwd(), next);
      index += 1;
    } else if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument "${arg}". Run with --help.`);
    }
  }

  opts.ids = explicitIds ?? Array.from({ length: count }, (_, offset) => from + offset);
  validateEncounterIds(opts.ids);
  return opts;
}

function parseIds(value: string): number[] {
  return value
    .split(",")
    .flatMap((part) => {
      const trimmed = part.trim();
      const rangeMatch = /^(\d+)-(\d+)$/.exec(trimmed);
      if (!rangeMatch) return [parsePositiveInt(trimmed, "--ids")];

      const start = parsePositiveInt(rangeMatch[1], "--ids");
      const end = parsePositiveInt(rangeMatch[2], "--ids");
      if (end < start) {
        throw new Error(`Invalid id range "${trimmed}".`);
      }
      return Array.from({ length: end - start + 1 }, (_, offset) => start + offset);
    });
}

function parsePositiveInt(value: string, flag: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${flag} expects a positive integer.`);
  }
  return parsed;
}

function validateEncounterIds(ids: number[]) {
  const missing = ids.filter((id) => !encounterText[id]);
  if (missing.length > 0) {
    throw new Error(`Unknown encounter ids: ${missing.join(", ")}.`);
  }
}

function renderPrompts(opts: CliOptions): string {
  if (opts.format === "text") {
    return opts.ids
      .map((id) => `Encounter ${id}: ${encounterText[id].title}\n\n${buildEncounterBackgroundPrompt(id)}`)
      .join("\n\n---\n\n");
  }

  const body = opts.ids
    .map((id) => {
      const encounter = encounterText[id];
      const prompt = buildEncounterBackgroundPrompt(id);
      return `## ${id}. ${encounter.title}\n\n\`\`\`text\n${prompt}\n\`\`\``;
    })
    .join("\n\n");

  return `# Encounter Background Prompts\n\n${body}\n`;
}

function printUsage() {
  console.log(
    `
Usage: jiti scripts/generate-assets/generate-encounter-background-prompts.ts [options]

Options:
  --ids <list>          Comma list or ranges, e.g. 1,2,6-10
  --from <id>           First encounter id when --ids is omitted
  --count <number>      Number of prompts when --ids is omitted
  --format <format>     markdown or text
  --out <path>          Write prompts to a file instead of stdout
  --help, -h            Show this help

Examples:
  npm run generate:encounter-prompts -- --ids 1-5
  npm run generate:encounter-prompts -- --from 11 --count 5 --out docs/encounter-background-prompts.md
`.trim(),
  );
}

function run() {
  const opts = parseArgs();
  const output = renderPrompts(opts);

  if (!opts.out) {
    console.log(output);
    return;
  }

  mkdirSync(dirname(opts.out), { recursive: true });
  writeFileSync(opts.out, output);
  console.log(`Wrote ${opts.ids.length} encounter background prompts to ${opts.out}`);
}

run();

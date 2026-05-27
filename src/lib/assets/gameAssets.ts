import { itemText } from "@/lib/rpgContent/generatedText";

export type EncounterAssetId =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15
  | 16
  | 17
  | 18
  | 19
  | 20;

const base = "/assets/game";

export const gameOverBackground = `${base}/backgrounds/game-over.webp`;
export const levelClearedBackground = `${base}/backgrounds/level-cleared.webp`;
export const pathMapBackground = `${base}/backgrounds/path-map-retro.webp`;

export const encounterBackgrounds: Partial<Record<number, string>> = {
  1: `${base}/backgrounds/fallen-gate-retro.webp`,
  2: `${base}/backgrounds/mudslide-path-retro.webp`,
  3: `${base}/backgrounds/border-guard-retro.webp`,
  4: `${base}/backgrounds/speaking-marker-retro.webp`,
  5: `${base}/backgrounds/guardian-scouts-retro.webp`,
  6: `${base}/backgrounds/collapsed-bridge-retro.webp`,
  7: `${base}/backgrounds/archive-seal-retro.webp`,
  8: `${base}/backgrounds/dust-storm-retro.webp`,
  9: `${base}/backgrounds/caravan-secret-retro.webp`,
  10: `${base}/backgrounds/silent-hunters-retro.webp`,
  11: `${base}/backgrounds/spike-ladder-retro.webp`,
  12: `${base}/backgrounds/mirror-hall-retro.webp`,
  13: `${base}/backgrounds/venom-mist-retro.webp`,
  14: `${base}/backgrounds/divided-camp-retro.webp`,
  15: `${base}/backgrounds/mountain-vanguard-retro.webp`,
  16: `${base}/backgrounds/frozen-stair-retro.webp`,
  17: `${base}/backgrounds/star-observatory-retro.webp`,
  18: `${base}/backgrounds/upward-storm-retro.webp`,
  19: `${base}/backgrounds/last-pilgrims-retro.webp`,
  20: `${base}/backgrounds/final-gate-retro.webp`,
};

export function encounterBackgroundFor(encounterId: number): string {
  return encounterBackgrounds[encounterId] ?? encounterBackgrounds[1]!;
}

export function itemIconFor(itemId: number): string | null {
  const text = itemText[itemId as keyof typeof itemText];
  if (!text) return null;
  return `${base}/items/${text.id.replaceAll("_", "-")}.webp`;
}

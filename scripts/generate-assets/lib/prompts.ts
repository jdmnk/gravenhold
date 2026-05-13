import type { ImageAssetDef } from "./types";

const GLOBAL_STYLE = [
  "Visual target: old-school low-poly fantasy RPG, early 2000s browser MMORPG atmosphere, chunky readable silhouettes, hand-painted low-resolution texture feel, warm torchlight, worn parchment, carved stone, aged wood, brass trim.",
  "Original fantasy art direction only. Do not copy or reference any existing game, brand, logo, character, UI, or recognizable asset.",
  "Game-ready asset, readable at small sizes, cohesive muted earth palette with amber highlights and cool shadow contrast.",
  "No text, no letters, no UI labels, no watermark, no signature, no modern objects.",
].join(" ");

const BACKGROUND_SUFFIX = [
  GLOBAL_STYLE,
  "Wide encounter backdrop with strong center readability for overlaid RPG UI.",
  "Layered depth: foreground frame elements at edges, midground subject, distant misty background.",
  "No characters unless explicitly requested. Full-bleed image, no border, no frame.",
].join(" ");

const ITEM_SUFFIX = [
  GLOBAL_STYLE,
  "Single inventory item icon, centered, isolated, chunky shape, readable at 48px.",
  "Dark warm inventory-tile background, subtle amber rim light, no table, no hands, no duplicate objects.",
].join(" ");

const SPRITE_SUFFIX = [
  GLOBAL_STYLE,
  "Sprite sheet for simple CSS animation. Four equal frames in one horizontal row, each frame same character scale and alignment, generous padding, no frame numbers, no text.",
  "Dark neutral backdrop is acceptable; keep the subject separated from the background.",
].join(" ");

const UI_SUFFIX = [
  GLOBAL_STYLE,
  "Tileable-feeling UI texture or interface material. Useful for fantasy RPG panels and controls.",
  "No text, no icons, no logo.",
].join(" ");

export function buildPrompt(asset: ImageAssetDef): string {
  switch (asset.category) {
    case "backgrounds":
      return buildBackgroundPrompt(asset);
    case "items":
      return buildItemPrompt(asset);
    case "sprites":
      return buildSpritePrompt(asset);
    case "ui":
      return buildUiPrompt(asset);
  }
}

function buildBackgroundPrompt(asset: ImageAssetDef): string {
  return [
    `Asset type: encounter background.`,
    `Intended use: ${asset.intendedUse}.`,
    `Scene: ${asset.description}.`,
    BACKGROUND_SUFFIX,
  ].join(" ");
}

function buildItemPrompt(asset: ImageAssetDef): string {
  return [
    `Asset type: RPG inventory item icon.`,
    `Intended use: ${asset.intendedUse}.`,
    `Item: ${asset.description}.`,
    ITEM_SUFFIX,
  ].join(" ");
}

function buildSpritePrompt(asset: ImageAssetDef): string {
  return [
    `Asset type: animated game sprite sheet.`,
    `Intended use: ${asset.intendedUse}.`,
    `Subject and motion: ${asset.description}.`,
    SPRITE_SUFFIX,
  ].join(" ");
}

function buildUiPrompt(asset: ImageAssetDef): string {
  return [
    `Asset type: RPG UI texture.`,
    `Intended use: ${asset.intendedUse}.`,
    `Material: ${asset.description}.`,
    UI_SUFFIX,
  ].join(" ");
}

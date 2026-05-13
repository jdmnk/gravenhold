# Gravenhold Art Direction

Gravenhold should feel like an original old-school fantasy RPG: chunky silhouettes, worn materials, low-detail hand-painted textures, parchment panels, carved stone, aged wood, brass trim, and readable game icons.

Do not copy or reference RuneScape, OSRS, or any specific existing game asset. Use the broader early-2000s browser MMORPG feel as inspiration only.

## Asset Pipeline

The image pipeline follows the Athanor reference pattern:

- define asset jobs in `scripts/generate-assets/data/images.json`
- build prompts in `scripts/generate-assets/lib/prompts.ts`
- generate into `public/assets/game`
- reference assets through `src/lib/assets/gameAssets.ts`

Generation command:

```bash
npm run generate:images -- --dry-run
npm run generate:images -- --id fallen-gate
npm run generate:images -- --category items
```

Encounter scene prompts use the stricter retro horror RPG direction that matched the current UI:

```bash
npm run generate:encounter-prompts -- --ids 1-5
npm run generate:encounter-prompts -- --from 11 --count 5 --out docs/encounter-background-prompts.md
```

Curated scene notes live in `scripts/generate-assets/generate-encounter-background-prompts.ts`. When a generated scene works, keep its encounter-specific scene and subject wording there so the next batch stays consistent.

The generator reads `OPENAI_API_KEY` from root `.env` or `.env.local`. Optional environment overrides:

```bash
IMAGE_MODEL=gpt-image-1.5
IMAGE_QUALITY=medium
IMAGE_MAX_CONCURRENCY=1
IMAGE_REQUEST_DELAY_MS=1200
```

## V1 Batch

Current checked-in batch:

- 3 encounter backgrounds: fallen gate, mudslide path, guardian scouts
- 40 item icons covering the current onchain item pool
- CC0 UI pixel sprites from Kenney UI Pack - Pixel Adventure

Do not generate all 54 encounter images until the broader scene direction is approved in the UI.

## UI Usage

Assets are display-only. Gameplay state, item metadata, encounter ids, stats, rewards, and forecasts continue to come from Cairo/chain reads.

For V1 animation and motion:

- CSS transitions for reward reveal, pressed buttons, selected panels, HP/stat changes
- Self-hosted `@fontsource/medievalsharp` for display headings and buttons only
- Pixel-pack tile borders for the game shell, equipment, rewards, choices, and item frames
- optional PixiJS later for parallax and particles if the central encounter scene needs richer motion

Avoid AI-generated character sprite sheets unless they are cleaned up in Aseprite or generated with a proven transparent-background workflow. Bad sheets with painted backgrounds should not be layered over scene art.

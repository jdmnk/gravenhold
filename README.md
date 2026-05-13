## Getting Started

```
pnpm install

npm run dev:chain
npm run dev:frontend
```

Open [http://localhost:5173](http://localhost:5173) with your browser to see the result.

## Image Assets

Gravenhold has an Athanor-style image generation pipeline for first-pass game art:

```
npm run generate:images -- --dry-run
npm run generate:images -- --id fallen-gate
npm run generate:images -- --category items
```

Asset jobs live in `scripts/generate-assets/data/images.json`, prompts live in
`scripts/generate-assets/lib/prompts.ts`, and generated files are saved under
`public/assets/game`. The generator reads `OPENAI_API_KEY` from `.env`,
`.env.local`, or `src/.env`.

See `docs/art-direction.md` for the visual target and asset rules.

## Local Dojo Development

The Dojo V1 migration currently supports local Katana development.

```
npm run generate:display-content
npm run dojo:build
npm run dojo:test
npm run dev:chain
npm run smoke:onchain-local
npm run dev:frontend
```

`npm run dev:chain` starts local Katana, runs `sozo migrate`, writes `.env.local`
with `VITE_DOJO_*` addresses, and prints the frontend URL. The local
manifest and env file are machine-specific and ignored by git.

The Vite client reads chain config from `VITE_*` env vars. V1 local dev uses
`VITE_ACCOUNT_MODE=local`, which signs with the prefunded Katana account written
by `npm run dev:chain`. Slot/testnet/mainnet should use `VITE_ACCOUNT_MODE=wallet`
for the Cartridge Controller adapter.

Gameplay rules and rule-bearing content live in Cairo under `contracts/src`.
`npm run generate:display-content` only regenerates display copy in
`src/lib/rpgContent/generatedText.ts`; item stats, slots, tiers, encounter
difficulties, forecasts, and rewards are read from chain views.

`npm run dojo:bindgen` writes Dojo TypeScript bindings to `generated/dojo` for
future client integration work.

Cartridge wallet mode grants session policies only for the Gravenhold actions
contract methods used by the game: `start_run`, `choose_option`,
`choose_reward`, and `equip_item`. Set `VITE_CONTROLLER_KEYCHAIN_URL` only when
testing against a non-default Controller keychain.

## References

[Starknet Dojo examples](https://github.com/AkatsukiLabs/DojoByExample)
[RPG Prompts](https://www.rpgprompts.com/post/fate-core-system-harry-potter-chatgpt-prompt)
[Textures](https://www.reinerstilesets.de/graphics/texturen/ground/)

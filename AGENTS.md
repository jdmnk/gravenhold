# Gravenhold Project Principles

## Current Game Direction

Gravenhold is currently a deterministic single-player progression RPG. The player moves through a 20-level path, resolves 3 encounters per level, grows through repeated stat-based choices, earns item rewards, equips build-defining gear, and defeats boss gates by committing to a clear playstyle.

The current design baseline is documented in `docs/new-rpg-doc.md`.

## Design Principles

- Preserve determinism: the same seed plus the same player choices must produce the same run.
- Keep the core loop clear: encounter choice, explicit outcome, stat growth or health loss, reward choice, equipment decision, next level.
- Make progression legible. The player should understand which stat they are using, whether it is likely to pass, what changed afterward, and how gear supports their build.
- Support all four archetypes: Strength, Intellect, Agility, and Spirit. Each focused build should be viable.
- Prefer specialization over random stat spreading, while keeping non-optimal play understandable and sometimes survivable.
- Keep V1 focused. Avoid LLM narration, multiplayer, complex combat, skill trees, crafting, shops, quests, dialogue trees, procedural maps, status effects, and large inventory systems unless the product direction explicitly changes.
- Content should reinforce the stat fantasy: Strength solves through force/endurance, Intellect through reasoning/social strategy, Agility through speed/precision/stealth, and Spirit through willpower/empathy/mystic resistance.

## Code Architecture Principles

- Gravenhold is now a Vite + Dojo local-onchain game. Do not add Next.js code or `NEXT_PUBLIC_*` env vars.
- Cairo/Dojo is the gameplay source of truth. Game state transitions, success checks, XP gains, stat point allocation, damage, rewards, equipment rules, deterministic randomness, and rule-bearing content live under `contracts/src`.
- React components display decoded chain state and submit transactions. They must not decide success, damage, XP gain, stat point allocation, rewards, boss behavior, progression, or equipment effects.
- Runtime client code must not import `src/lib/rpg/*`. The old TypeScript RPG engine may remain only as temporary legacy simulation/reference code until Cairo tests replace it.
- Rule-bearing content is in `contracts/src/content/data.cairo`. TypeScript content under `src/lib/rpgContent` is display-only copy keyed by Cairo numeric IDs.
- Prefer Dojo-generated TypeScript bindings from `sozo build --typescript` as client/contract integration grows. Avoid hand-maintained TS mirrors of Cairo models and calls where generated bindings are practical.
- Keep deterministic randomness centralized in Cairo. Do not call `Math.random()` for gameplay.
- Model decoded chain state explicitly with TypeScript types in `src/lib/chain`.
- When changing gameplay or balance, add or update Cairo tests first. TypeScript simulation tests are legacy guardrails, not the long-term authority.

## Testing And Verification

- Run `npm run dojo:build` and `npm run dojo:test` after contract, content, or balance changes.
- Run `npm run test` after changing TypeScript tooling, display content, or legacy simulation guardrails.
- Run `npm run lint` and `pnpm build` after UI or exported API changes.
- Run `npm run dev:chain`, `npm run smoke:onchain-local`, and `npm run dev:frontend` when verifying the local onchain flow.
- If a design rule changes, update the gameplay docs and Cairo tests together.

## UI Principles

- Keep the UI playable and direct rather than decorative.
- Show the player the current level, encounter number, health, base stats, equipment bonuses, effective stats, current difficulty, available choices, result text, rewards, equipment, and inventory.
- Make choices concrete and outcome-oriented. Avoid abstract labels that hide what the player is actually doing.
- Do not put gameplay rules only in explanatory text. The interface should make the rule state visible through numbers, labels, and immediate feedback.

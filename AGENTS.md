# Gravenhold Project Principles

## Current Game Direction

Gravenhold is a deterministic single-player progression RPG. The player chooses a class, moves through a 20-level path, resolves 3 encounters per level with learned class skills, earns XP, assigns stat points, unlocks skills, equips build-defining gear, and defeats boss gates by committing to a clear playstyle.

The current class and skill progression plan is documented in `docs/class-skill-progression-plan.md`.
The long-term gameplay and balance framework is documented in
`docs/gameplay-progression-framework.md`.

## Design Principles

- Preserve determinism: the same seed plus the same player choices must produce the same run.
- Keep the core loop clear: class skill choice, explicit outcome, growth or health loss, reward choice, equipment decision, next level.
- Make progression legible. The player should understand which skill and stat they are using, whether it is likely to pass, what changed afterward, and how gear supports their build.
- Support all four archetypes: Strength, Intellect, Agility, and Spirit. Each focused build should be viable.
- Prefer class identity and skill specialization over random stat spreading, while keeping non-optimal play understandable and sometimes survivable.
- Keep V1 focused. Avoid LLM narration, multiplayer, complex combat, sprawling skill trees, crafting, shops, quests, dialogue trees, procedural maps, status effects, and large inventory systems unless the product direction explicitly changes.
- Content should reinforce the stat fantasy: Strength solves through force/endurance, Intellect through reasoning/social strategy, Agility through speed/precision/stealth, and Spirit through willpower/empathy/mystic resistance.

## Code Architecture Principles

- Gravenhold is a Vite + Dojo local-onchain game. Use `VITE_*` env vars for client runtime configuration.
- Cairo/Dojo is the gameplay source of truth. Game state transitions, success checks, XP gains, stat point allocation, skill unlocks, damage, rewards, equipment rules, deterministic randomness, and rule-bearing content live under `contracts/src`.
- React components display decoded chain state and submit transactions. They must not decide success, damage, XP gain, stat allocation rules, skill unlock rules, rewards, boss behavior, progression, or equipment effects.
- Runtime client code must not import `src/lib/rpg/*`. Those modules are reserved for tests and content tooling.
- Rule-bearing content is in `contracts/src/content/data.cairo`. TypeScript content under `src/lib/rpgContent` is display-only copy keyed by Cairo numeric IDs.
- Prefer Dojo-generated TypeScript bindings from `sozo build --typescript` as client/contract integration grows. Avoid hand-maintained TS mirrors of Cairo models and calls where generated bindings are practical.
- Keep deterministic randomness centralized in Cairo. Do not call `Math.random()` for gameplay.
- Model decoded chain state explicitly with TypeScript types in `src/lib/chain`.
- When changing gameplay or balance, add or update Cairo tests first. TypeScript simulation tests are secondary guardrails.

## Testing And Verification

- Run `npm run dojo:build` and `npm run dojo:test` after contract, content, or balance changes.
- Run `npm run test` after changing TypeScript tooling, display content, or simulation guardrails.
- Run `npm run lint` and `pnpm build` after UI or exported API changes.
- Run `npm run dev:chain`, `npm run smoke:onchain-local`, and `npm run dev:frontend` when verifying the local onchain flow.
- If a design rule changes, update the gameplay framework, implementation plan,
  and Cairo tests together.

## UI Principles

- Keep the UI playable and direct rather than decorative.
- Show the player the current level, encounter number, health, class, learned skills, base stats, equipment bonuses, effective stats, current difficulty, available choices, result text, rewards, equipment, and inventory.
- Make choices concrete and outcome-oriented. Avoid abstract labels that hide what the player is actually doing.
- Do not put gameplay rules only in explanatory text. The interface should make the rule state visible through numbers, labels, and immediate feedback.

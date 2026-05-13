# Athanor Dojo Client Findings

Reference inspected: `starknet_reference/athanor`

Purpose: capture what Athanor teaches us for the Build Aura Dojo migration, especially around Cairo ownership, generated TypeScript bindings, Torii, Cartridge, and whether any TypeScript gameplay engine should remain.

## Executive Summary

Athanor reinforces a Cairo-first architecture.

Its rule-bearing data and gameplay logic live in Cairo. The client is a Vite React app that connects to a Dojo world through Torii, RECS state, Starknet React, and Cartridge Controller. TypeScript is used for UI, display constants, asset paths, packed-field decoding, transaction construction, and indexed state subscriptions.

For Build Aura, the clean direction is:

1. Keep gameplay rules and rule-bearing content in Cairo.
2. Generate TypeScript bindings from Cairo/Dojo with `sozo build --typescript`.
3. Keep TypeScript display data keyed by Cairo IDs.
4. Avoid TypeScript-to-Cairo gameplay generation.
5. Remove or quarantine the old TypeScript RPG engine once content generation no longer depends on it.

## Relevant Structure

Key files:

```txt
starknet_reference/athanor/
  Scarb.toml
  dojo_dev.toml
  dojo_slot.toml
  dojo_sepolia.toml
  torii_sepolia.toml
  scripts/deploy.sh
  contracts/src/
    constants.cairo
    store.cairo
    systems/play.cairo
    systems/setup.cairo
    models/
    types/
    helpers/
    elements/
    events/
  client/
    dojo.config.ts
    src/
      main.tsx
      cartridgeConnector.ts
      dojo/setup.ts
      dojo/systems.ts
      dojo/contractModels.ts
      hooks/
      game/constants.ts
      game/packer.ts
```

## Dojo Setup

Athanor uses a root Scarb workspace with a `contracts` member and Dojo `1.8.0`.

The project includes multiple Dojo profiles:

- `dojo_dev.toml`
- `dojo_slot.toml`
- `dojo_sepolia.toml`

The dev profile uses:

```toml
[namespace]
default = "ATHANOR"

[env]
rpc_url = "http://localhost:5050/"

[writers]
"ATHANOR" = ["ATHANOR-Play"]

[owners]
"ATHANOR" = ["ATHANOR-Setup"]
```

Build Aura already follows the same broad workspace/profile direction. The main additional lesson is that profile-specific deployment is explicit and kept outside the client. The client consumes manifests and env.

## Cairo Owns Rule-Bearing Data

Athanor keeps game constants and rule-bearing types in Cairo:

- `contracts/src/constants.cairo`
- `contracts/src/types/effect.cairo`
- `contracts/src/types/ingredient.cairo`
- `contracts/src/types/role.cairo`
- `contracts/src/elements/roles/*.cairo`
- `contracts/src/elements/effects/*.cairo`

Examples:

- Zone drain, trap/gold/heal/beast/drop probabilities are Cairo constants.
- Hero role stats are applied in Cairo role modules.
- Potion effects and buff values are defined and applied in Cairo.
- Random role draw and effect application are Cairo logic.

This supports a Cairo-first Build Aura structure:

- item slots, tiers, and bonuses in Cairo
- encounter category, difficulty, and option approach in Cairo
- stat gain, health loss, reward generation, and equipment effects in Cairo
- display names/descriptions in TypeScript only as labels keyed by Cairo numeric IDs

## TypeScript Does Not Generate Cairo Gameplay

Athanor does not appear to use TypeScript to generate Cairo gameplay logic.

It has TypeScript scripts for asset generation, but rule-bearing game implementation is handwritten Cairo. That is a useful contrast with Build Aura's current `scripts/generate_rpg_content.ts`, which generates Cairo content from `src/lib/rpg` data and one TS selector.

For Build Aura, the long-term cleanup should be:

1. Stop importing `src/lib/rpg/content` and `src/lib/rpg/selectors` from the Cairo content generator.
2. Move rule-bearing content directly into Cairo, or into neutral data if we later need a content editing pipeline.
3. Keep generated TypeScript content display-only.
4. Remove or quarantine `src/lib/rpg` so it cannot become a shadow rules engine.

## Generated TypeScript Bindings

Dojo can generate TypeScript bindings from the Cairo/Dojo world:

```bash
sozo build --typescript --bindings-output <dir>
```

In this repo's installed toolchain (`sozo 1.8.6`), this generated:

```txt
bindings/typescript/models.gen.ts
bindings/typescript/contracts.gen.ts
```

Those bindings include:

- model types such as `Run`, `Character`, `ChoiceLog`, `RewardOffer`
- typed setup schema
- contract call builders and action wrappers such as `startRun`, `chooseOption`, `chooseReward`, `equipItem`

Athanor itself manually maintains:

- `client/src/dojo/contractModels.ts`
- `client/src/dojo/systems.ts`

That works, but for Build Aura the better approach is to prefer generated bindings where practical, so client types and contract interfaces come from Cairo rather than hand-maintained TypeScript.

Recommended Build Aura script:

```json
{
  "scripts": {
    "dojo:bindgen": "PATH=\"$HOME/.asdf/shims:$PATH\" asdf exec sozo build --typescript --bindings-output src/lib/dojo/bindings"
  }
}
```

Generated files can be committed if that gives the client stable imports and easier review, or regenerated in CI if the workflow is reliable. Either way, the direction should be Cairo -> TypeScript, not TypeScript -> Cairo.

## Torii And RECS Pattern

Athanor uses Torii as the read/indexing layer:

- `client/src/dojo/setup.ts` creates a `ToriiClient`.
- It probes both RPC and Torii before booting.
- It defines RECS components.
- It calls `getSyncEntities(...)` from `@dojoengine/state`.
- React hooks read from synced RECS components through `@dojoengine/react`.

Important files:

```txt
client/src/dojo/setup.ts
client/src/dojo/contractModels.ts
client/src/hooks/useGame.ts
client/src/hooks/useInventory.ts
client/src/hooks/useRecipes.ts
```

This is useful for Build Aura stage 2 if we want:

- real-time state subscriptions
- indexed logs/events
- richer queries
- leaderboards or multi-run views
- a more canonical Dojo client shape

For Build Aura V1 local, direct action-system views remain acceptable because the state is small and reads are simple. Torii is not required to preserve correctness. It is an indexing/subscription improvement, not a gameplay source of truth.

## Cartridge Pattern

Athanor uses a mature Cartridge setup:

```txt
client/src/cartridgeConnector.ts
```

Notable details:

- uses `@cartridge/connector/controller`
- plugs into `@starknet-react/core`
- defines session policies for allowed game methods
- uses the active manifest to locate contract addresses
- sets `namespace`
- sets Slot project outside local dev
- computes default chain IDs for Katana and Sepolia
- clears stale Controller session storage with a version marker

Build Aura's current direct `@cartridge/controller` adapter is fine for local/V1 preparation, but Athanor is a good reference if we later move to the full `starknet-react` connector/provider model for hosted deployments.

## Client Display Data

Athanor keeps UI/display constants in TypeScript:

```txt
client/src/game/constants.ts
```

This includes:

- zone names
- ingredient names
- effect names
- asset keys
- role names
- colors
- display helpers

That pattern is appropriate for Build Aura too. Names, descriptions, images, and UI colors do not need to be onchain.

However, Athanor also duplicates some rule-adjacent values in TypeScript, such as role stats, effect multipliers, and zone risk values for display. For Build Aura we should be stricter:

- UI may display chain-returned values.
- UI may map IDs to labels and descriptions.
- UI should not mirror balance formulas or rule-bearing constants unless they are generated directly from Cairo bindings or used only as non-authoritative copy.

## Packed Field Decoding

Athanor has client utilities for unpacking packed onchain fields:

```txt
client/src/game/packer.ts
```

This is acceptable because it decodes canonical chain state for display. It does not decide game outcomes.

For Build Aura, equivalent utilities are fine for:

- inventory bitsets
- equipment item IDs
- enum decoding
- display summaries derived from chain fields

They should not compute success, damage, stat gain, reward contents, boss behavior, or progression.

## Deployment Script Lessons

Athanor's `scripts/deploy.sh` is more complete than Build Aura's current local-only script.

It handles:

- dev / slot / sepolia profiles
- contract build
- external contract declarations/deployments
- config patching before migration
- `sozo migrate`
- manifest copying into the client
- client `.env` writing
- next-step printing for Torii and frontend startup

For Build Aura stage 2, this is a useful deployment reference. For V1 local, Build Aura's simpler `scripts/dev_up.sh` is enough.

## What To Copy

Good patterns to copy:

- Cairo-first game rules and rule-bearing content.
- Store facade around `WorldStorage`.
- Typed model traits for reusable validation and behavior.
- Explicit profile files for dev/slot/sepolia.
- Client boot probe for RPC/Torii before rendering the app.
- Cartridge policies derived from manifest addresses.
- Optional session storage versioning for Cartridge.
- Display data kept separate from onchain rules.

## What Not To Copy Blindly

Avoid copying:

- Manual RECS model definitions if generated Dojo TS bindings can replace or reduce them.
- Manual system call wrappers where generated contract bindings are sufficient.
- Rule-adjacent display constants duplicated in TypeScript.
- Full Torii stack before we need subscriptions/indexed queries.
- VRF integration unless Build Aura's deterministic seed model changes.
- Minigame/NFT standard integration unless product direction requires tokenized sessions.

## Build Aura Recommendation

The strongest path is:

1. Move Build Aura rule-bearing content to Cairo-first files.
2. Keep TS display content keyed by Cairo numeric IDs.
3. Add `dojo:bindgen` and generated TS bindings from `sozo build --typescript`.
4. Replace hand-maintained calldata/model types with generated bindings where practical.
5. Keep local V1 reads through action-system views until Torii is needed.
6. Add Torii/RECS in stage 2 if we want live subscriptions, richer queries, or hosted/indexed UX.
7. Remove or quarantine the old TypeScript RPG engine after generator cleanup.

This eliminates unnecessary hacks while keeping the implementation close to established Dojo patterns.

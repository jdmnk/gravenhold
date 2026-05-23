# Vercel + Cartridge Slot Deploy Plan

This plan covers the first hosted target: a Vercel frontend connected to a Cartridge Slot Katana world. Sepolia and mainnet come later.

## Goal

Deploy Gravenhold as a static Vite app on Vercel, with gameplay transactions sent from the browser to a deployed Dojo world on Cartridge Slot.

In this setup:

- Vercel only hosts the built frontend assets.
- Slot hosts the playable Katana chain and Dojo world.
- The browser uses Cartridge Controller instead of a local private key.
- The player clicks `Start Run`; if not connected, Controller connects first, then the run starts.
- Seed input is hidden from players. Slot runs use an internally generated seed.

## Current State

The app is already close to deployable:

- It is Vite-based, not Next.js.
- `pnpm build` emits static assets into `dist`.
- Runtime config already comes from `VITE_*` variables in `src/lib/chain/networkConfig.ts`.
- Wallet mode already exists through `src/lib/chain/account/controllerSession.ts`.
- Session policies already cover:
  - `start_run`
  - `choose_option`
  - `choose_reward`
  - `equip_item`

The current repo docs do not yet describe Vercel, Slot, or production deployment. Reference projects do:

- `starknet_reference/zordle/docs/deploy.md` has the clearest Slot/Sepolia/Mainnet runbook.
- `starknet_reference/zordle/scripts/deploy_slot.sh` shows the deployment script shape.
- `starknet_reference/zordle/client/vercel.json` shows the SPA rewrite needed for Vercel.
- `starknet_reference/athanor/dojo_slot.toml` and `starknet_reference/zordle/dojo_slot.toml` confirm the separate Dojo profile pattern.

## How Playing Works On Vercel

There is no local Katana on Vercel. The deployed frontend cannot use:

- `VITE_ACCOUNT_MODE=local`
- `VITE_LOCAL_ACCOUNT_ADDRESS`
- `VITE_LOCAL_PRIVATE_KEY`
- `http://localhost:5050`

Instead, a Slot deployment uses:

- `VITE_DOJO_PROFILE=slot`
- `VITE_ACCOUNT_MODE=wallet`
- `VITE_STARKNET_RPC_URL=https://api.cartridge.gg/x/<slot-name>/katana`
- `VITE_STARKNET_CHAIN_ID=<slot chain id>`
- `VITE_DOJO_WORLD_ADDRESS=<world address from manifest_slot.json>`
- `VITE_DOJO_ACTIONS_ADDRESS=<gravenhold-actions address from manifest_slot.json>`
- `VITE_SLOT_PROJECT=<slot-name>`

When the player clicks `Start Run`:

1. The frontend creates a Cartridge Controller session if needed.
2. Controller uses the configured RPC URL and chain id.
3. Controller session policies allow game actions without repeated approval prompts.
4. `start_run` is executed against the Slot `gravenhold-actions` contract.
5. The app reads run state back through the same Slot RPC.
6. Future choices/rewards/equipment actions are sent as onchain transactions to the same Slot world.

The run state is persistent on the Slot world until the Slot world is reset or replaced by a new world seed/deployment.

## Implementation Plan

### 1. Add Slot Dojo Config

Create `dojo_slot.toml` at repo root, modeled on Zordle and Athanor:

```toml
[world]
name = "Gravenhold Slot"
description = "Gravenhold practice deployment"
seed = "gravenhold_slot_v1"

[namespace]
default = "gravenhold"

[writers]
"gravenhold" = ["gravenhold-actions"]

[env]
rpc_url = "https://api.cartridge.gg/x/<slot-name>/katana"
account_address = "0x0"
private_key = "0x0"
```

Use the same namespace as local unless we intentionally want Slot state to be a separate product namespace.

When model schemas change, bump the world seed, for example:

```toml
seed = "gravenhold_slot_v2"
```

That creates a new world address. Existing Slot runs should be treated as disposable practice data.

### 2. Add Slot Katana Config

Add `katana_slot.toml` for reference and Slot setup, modeled on `starknet_reference/zordle/katana_slot.toml`:

```toml
[dev]
dev = true
no_fee = true

[server]
http_cors_origins = "*"
timeout = 300

[cartridge]
controllers = true
paymaster = true
```

This is not a Vercel concern; it documents how the Slot Katana instance should be configured.

### 3. Add `scripts/deploy_slot.sh`

Build a Gravenhold-specific deploy script from the Zordle shape:

Inputs:

```bash
SLOT_NAME=gravenhold-slot
SLOT_ACCOUNT_ADDRESS=0x...
SLOT_PRIVATE_KEY=<slot-private-key>
```

Flow:

1. Validate `sozo`, `jq`, and required env.
2. Compute `RPC_URL=https://api.cartridge.gg/x/${SLOT_NAME}/katana`.
3. Temporarily patch `dojo_slot.toml` with:
   - `rpc_url`
   - `account_address`
   - `private_key`
4. Run `sozo build -P slot`.
5. Run `sozo migrate -P slot --rpc-url "$RPC_URL" --account-address "$SLOT_ACCOUNT_ADDRESS" --private-key "$SLOT_PRIVATE_KEY"`.
6. Extract from `manifest_slot.json`:
   - `.world.address`
   - contract with tag `gravenhold-actions`
7. Query `starknet_chainId` from the Slot RPC.
8. Write a local generated env file, probably `.env.slot.local`.
9. Print the exact Vercel env values to paste or sync.

Generated frontend env should be:

```bash
VITE_STARKNET_RPC_URL=https://api.cartridge.gg/x/<slot-name>/katana
VITE_STARKNET_CHAIN_ID=<chain id from starknet_chainId>
VITE_ACCOUNT_MODE=wallet
VITE_DOJO_PROFILE=slot
VITE_DOJO_NAMESPACE=gravenhold
VITE_DOJO_WORLD_ADDRESS=<world>
VITE_DOJO_ACTIONS_ADDRESS=<actions>
VITE_SLOT_PROJECT=<slot-name>
VITE_CONTROLLER_KEYCHAIN_URL=
```

Do not expose deployer private keys through Vercel or `VITE_*`.

### 4. Track Slot Manifest

Current `.gitignore` only ignores `manifest_dev.json`, so `manifest_slot.json` can be tracked.

Decision:

- Track `manifest_slot.json` so the deployed world is reproducible and inspectable.
- Keep `.env.slot.local` ignored.
- Optionally add `.env.slot.example` with placeholders.

Tracking the manifest matches Zordle’s practice-slot approach and makes it possible for contributors to run against the shared Slot world without redeploying.

### 5. Add Vercel SPA Config

Add `vercel.json`:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

This matches the Zordle reference and prevents direct route refreshes from 404ing if the app later adds client routes.

Vercel project settings:

- Framework preset: Vite
- Install command: `pnpm install`
- Build command: `pnpm build`
- Output directory: `dist`

Vercel’s Vite preset should infer most of this, but setting it explicitly avoids ambiguity.

### 6. Configure Vercel Env

Add these Vercel environment variables for the Slot deployment:

```bash
VITE_STARKNET_RPC_URL=https://api.cartridge.gg/x/<slot-name>/katana
VITE_STARKNET_CHAIN_ID=<slot chain id>
VITE_ACCOUNT_MODE=wallet
VITE_DOJO_PROFILE=slot
VITE_DOJO_NAMESPACE=gravenhold
VITE_DOJO_WORLD_ADDRESS=<world>
VITE_DOJO_ACTIONS_ADDRESS=<actions>
VITE_SLOT_PROJECT=<slot-name>
```

Do not add:

```bash
VITE_LOCAL_ACCOUNT_ADDRESS
VITE_LOCAL_PRIVATE_KEY
```

Those are local-only.

Because Vite statically injects `VITE_*` values at build time, changing any of these requires a new Vercel deployment.

### 7. Local Slot Smoke Before Vercel

Before deploying to Vercel, run the frontend locally against Slot:

```bash
pnpm build
pnpm dev --mode slot
```

or load the generated Slot env into the shell before `pnpm dev`.

Smoke path:

1. Open the app.
2. Confirm title badge says `Slot`.
3. Click `Start Run`.
4. Complete Cartridge login.
5. Confirm a run starts.
6. Choose one option.
7. Choose one reward.
8. Refresh the page and confirm the active run reloads.

### 8. Vercel Smoke

After Vercel deploy:

1. Open the Vercel URL in a fresh browser profile.
2. Confirm no local seed field is visible.
3. Confirm the network badge says `Slot`.
4. Click `Start Run`.
5. Confirm Controller opens and connects.
6. Play at least one full level.
7. Refresh and confirm the same run resumes.
8. Verify Vercel browser console has no missing-env or RPC CORS errors.

## Required Code Changes

Minimum:

- `dojo_slot.toml`
- `katana_slot.toml`
- `scripts/deploy_slot.sh`
- `vercel.json`
- `.env.slot.example`
- Improve `requiredPublicEnv()` error copy so Slot/Vercel missing-env errors do not say “Run npm run dev:chain”.
- Optional: add `build:slot` script if we want local mode-file builds:

```json
"build:slot": "tsc --noEmit && vite build --mode slot"
```

Likely not needed if Vercel env vars are managed in the Vercel dashboard.

## Vercel Preview Strategy

Recommended:

- Production Vercel deployment points at the current Slot world.
- Preview deployments also point at the same Slot world at first.
- Later, add separate Slot worlds for `preview` and `production` if multiple branches need isolated state.

Tradeoff:

- Same Slot world is simpler.
- Separate Slot worlds avoid accidental state/schema mismatch during branch testing.

## Sepolia/Mainnet Later

Slot is a practice deployment. Before Sepolia/mainnet:

- Add `dojo_sepolia.toml` and eventually `dojo_mainnet.toml`.
- Use wallet mode only.
- Keep seeds hidden.
- Decide gas/paymaster policy.
- Add stronger deploy guards for mainnet.
- Ensure Controller policies match the exact deployed action address.
- Treat world seed changes as product-level migrations, not casual resets.

## References

- Vercel Vite docs: https://vercel.com/docs/frameworks/frontend/vite
- Vercel build config docs: https://vercel.com/docs/deployments/configure-a-build
- Vite env docs: https://vite.dev/guide/env-and-mode
- Vite production build docs: https://vite.dev/guide/build
- Cartridge Controller overview: https://docs.cartridge.gg/controller/overview
- Cartridge Controller configuration: https://docs.cartridge.gg/controller/configuration
- Local references:
  - `starknet_reference/zordle/docs/deploy.md`
  - `starknet_reference/zordle/scripts/deploy_slot.sh`
  - `starknet_reference/zordle/client/vercel.json`
  - `starknet_reference/athanor/scripts/deploy.sh`
  - `starknet_reference/athanor/dojo_slot.toml`

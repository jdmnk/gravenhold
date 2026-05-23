# Slot + Vercel Deployment Runbook

This is the practical next-step runbook for deploying Gravenhold as a Vercel
static frontend backed by a Cartridge Slot Katana world.

## Command Matrix

Fully local development:

```bash
npm run dev:chain
npm run dev:frontend
```

This starts local Katana, migrates the dev world, writes `.env.local`, and runs
the Vite frontend against local chain state.

Slot backend with local frontend:

```bash
curl -L https://slot.cartridge.sh | bash
slot auth login
slot deployments create gravenhold-slot katana -c katana_slot.toml
slot deployments accounts gravenhold-slot katana

SLOT_NAME=gravenhold-slot \
SLOT_ACCOUNT_ADDRESS=0x... \
SLOT_PRIVATE_KEY=<slot-private-key> \
scripts/deploy_slot.sh

pnpm dev:slot
```

This deploys or upgrades the Dojo world on Cartridge Slot, writes
`.env.slot.local`, and runs the Vite frontend locally against Slot chain state.

After the first successful Slot deploy, `pnpm dev:slot` is enough when you only
want to run the local frontend against the existing Slot world. Re-run
`scripts/deploy_slot.sh` when contracts, Cairo content, or balance changed and
must be migrated to Slot.

## What Exists Before First Slot Deploy

Before the first Slot deploy, you have:

- `SLOT_NAME`, for example `gravenhold-slot`
- a remote Katana deployment created with
  `slot deployments create gravenhold-slot katana -c katana_slot.toml`
- `SLOT_ACCOUNT_ADDRESS` from `slot deployments accounts` after the Katana
  deployment exists
- `SLOT_PRIVATE_KEY` from `slot deployments accounts` after the Katana
  deployment exists
- the predictable RPC URL:
  `https://api.cartridge.gg/x/gravenhold-slot/katana`

Before the first Slot deploy, you do not have:

- `VITE_DOJO_WORLD_ADDRESS`
- `VITE_DOJO_ACTIONS_ADDRESS`
- `manifest_slot.json`
- `.env.slot.local`

Those are produced by `scripts/deploy_slot.sh` after `sozo migrate` creates the
world and deploys `gravenhold-actions`.

## 0. Install Slot CLI

If `slot` is not found, install the Cartridge Slot CLI:

```bash
curl -L https://slot.cartridge.sh | bash
```

Follow the installer output. It may ask you to restart your shell or add Slot's
bin directory to your `PATH`.

Then authenticate:

```bash
slot auth login
```

## 1. Create Slot Katana And Get Credentials

Create the Slot Katana deployment first:

```bash
slot deployments create gravenhold-slot katana -c katana_slot.toml
```

Then fetch the prefunded deployer account for that Slot Katana instance:


```bash
slot deployments accounts gravenhold-slot katana
```

Keep the returned private key local. Do not put it in Vercel, `.env.slot.local`,
or any `VITE_*` variable.

## 2. Deploy The Dojo World To Slot

Run the Slot deploy script with the account returned by Slot:

```bash
SLOT_NAME=gravenhold-slot \
SLOT_ACCOUNT_ADDRESS=0x... \
SLOT_PRIVATE_KEY=<slot-private-key> \
scripts/deploy_slot.sh
```

The script will:

- build the `slot` Dojo profile
- migrate the world to `https://api.cartridge.gg/x/gravenhold-slot/katana`
- generate `manifest_slot.json`
- write `.env.slot.local`
- print the exact Vercel `VITE_*` environment variables

If model schemas changed and `sozo migrate` rejects the upgrade, bump the
`seed` in `dojo_slot.toml` and redeploy. That creates a new world address and
resets practice Slot state.

## 3. Track The Slot Manifest

After a successful deploy, commit `manifest_slot.json`.

Do not commit:

- `.env.slot.local`
- `SLOT_PRIVATE_KEY`
- `SLOT_ACCOUNT_ADDRESS`
- local private keys

## 4. Smoke Test Locally Against Slot

Start the frontend using the generated Slot env file:

```bash
pnpm dev:slot
```

Smoke path:

1. Open the local Vite URL.
2. Confirm the start badge says `Slot`.
3. Confirm the seed field is hidden.
4. Click `Start Run`.
5. Complete Cartridge Controller login.
6. Confirm a run starts.
7. Choose one encounter option.
8. Choose one reward.
9. Refresh the page and confirm the active run reloads.

Fix any Controller, RPC, missing-env, or CORS issues before deploying Vercel.

## 5. Configure Vercel

Create or update the Vercel project with:

- Framework preset: `Vite`
- Install command: `pnpm install`
- Build command: `pnpm build`
- Output directory: `dist`

Add the environment variables printed by `scripts/deploy_slot.sh`:

```bash
VITE_STARKNET_RPC_URL=https://api.cartridge.gg/x/gravenhold-slot/katana
VITE_STARKNET_CHAIN_ID=<chain id>
VITE_ACCOUNT_MODE=wallet
VITE_DOJO_PROFILE=slot
VITE_DOJO_NAMESPACE=gravenhold
VITE_DOJO_WORLD_ADDRESS=<world>
VITE_DOJO_ACTIONS_ADDRESS=<actions>
VITE_SLOT_PROJECT=gravenhold-slot
```

Do not add these to Vercel:

```bash
VITE_LOCAL_ACCOUNT_ADDRESS
VITE_LOCAL_PRIVATE_KEY
SLOT_ACCOUNT_ADDRESS
SLOT_PRIVATE_KEY
```

Vite injects `VITE_*` variables at build time, so changing any of these requires
a new Vercel deployment.

## 6. Deploy And Smoke Test Vercel

Deploy the Vercel project, then run the hosted smoke path:

1. Open the Vercel URL in a fresh browser profile.
2. Confirm the start badge says `Slot`.
3. Confirm no local seed field is visible.
4. Click `Start Run`.
5. Confirm Cartridge Controller opens and connects.
6. Play at least one full level.
7. Refresh and confirm the same run resumes.
8. Check the browser console for missing-env, Controller, RPC, or CORS errors.

## Useful Commands

```bash
pnpm build
pnpm build:slot
npm run dojo:build
asdf exec sozo build -P slot
npm run dojo:test
npm run lint
npm run test
```

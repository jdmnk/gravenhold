# Zordle Dojo + Client Reference

This document analyzes `starknet_reference/zordle` as a practical reference for converting a TypeScript game into a Dojo-backed game. It focuses on how the repo is structured, how Dojo is configured, how local dev works, and how the browser client communicates with the chain.

## Executive Summary

Zordle is a compact Dojo project with a clear split:

- Cairo/Dojo world and systems live in `zordle/contracts`.
- Environment-specific Dojo world config lives at the repo root as `dojo_*.toml`.
- Katana config lives at the repo root as `katana_*.toml`.
- Deployment/local orchestration lives in `zordle/scripts`.
- The frontend is a separate Vite React app in `zordle/client`.
- Generated Dojo manifests live at the repo root as `manifest_*.json`.

The client does not use Torii for state sync. It talks directly to the deployed `actions` system contract:

- Reads use `RpcProvider.callContract` against explicit read-only view entrypoints on `actions`.
- Writes use `AccountInterface.execute` against `actions` and, for NFT mode, Cartridge VRF.
- Local practice mode uses a browser-created burner account deployed to local Katana.
- NFT mode uses Cartridge Controller through `@starknet-react/core`.

For our future TS-to-Dojo conversion, the strongest pattern to copy is not the Wordle-specific logic. It is the layering:

1. Keep game rules in Cairo systems.
2. Store canonical state in `#[dojo::model]` structs.
3. Expose explicit view functions for the client.
4. Generate/read manifest addresses after `sozo migrate`.
5. Make local dev write `.env.local` from the fresh manifest.
6. Keep frontend chain access in a small `client/src/chain` module.

## Repository Structure

High-level layout:

```text
zordle/
  Scarb.toml                  Workspace Scarb config and shared deps
  contracts/
    Scarb.toml                Cairo package config
    src/
      lib.cairo               Module root
      constants.cairo         Game constants and Dojo namespace helper
      store.cairo             Typed facade over Dojo WorldStorage
      models/
        index.cairo           All #[dojo::model] structs
        game.cairo            Game constructor/assert helpers
        dictionary.cairo      Dictionary constructor/assert helpers
        candidate.cairo       CandidateChunk constructor helper
      systems/
        actions.cairo         Main gameplay system + client views
        setup.cairo           Dictionary/content loading system
      helpers/                Pure Cairo helpers
      interfaces/vrf.cairo    Cartridge VRF interface
  dojo_dev.toml               Local Dojo world profile
  dojo_slot.toml              Cartridge Katana slot profile
  dojo_sepolia.toml           Sepolia profile
  dojo_mainnet.toml           Mainnet profile
  katana_dev.toml             Local Katana config
  katana_slot.toml            Cartridge slot Katana config
  manifest_dev.json           Local generated manifest, machine-specific
  manifest_slot.json          Tracked live practice-slot manifest
  manifest_sepolia.json       Tracked live Sepolia manifest
  manifest_mainnet.json       Tracked live mainnet manifest
  scripts/
    dev_up.sh                 Local Katana + migrate + dictionary loader
    load_dictionary.mjs       Starknet.js content loader
    deploy_slot.sh            Practice-slot deploy
    deploy_sepolia.sh         Sepolia deploy
    deploy_mainnet.sh         Mainnet deploy
  client/
    package.json              Vite React client
    vite.config.ts            Env config and dev server
    src/
      App.tsx                 UI and game route state machine
      networkConfig.ts        Runtime network/address selection
      manifest.ts             Imports manifest_*.json
      burnerAccount.ts        Local/practice burner account deployment
      gameAccount.tsx         Chooses burner vs Cartridge Controller account
      cartridgeConnector.ts   Controller session policies
      chain/
        contractSystems.ts    Write-call builders
        views.ts              Read-only callContract wrappers
        state.ts              Felt-array decoders
```

The repo has a nested `.git` in `starknet_reference/zordle`, so treat it as a reference checkout/vendor copy. The parent repo ignores `starknet_reference/zordle` via `starknet_reference/.gitignore`.

## Toolchain And Package Setup

Pinned tools are in `zordle/.tool-versions`:

```text
scarb 2.15.1
starkli 0.4.2
starknet-foundry 0.55.0
sozo 1.8.6
```

The root `Scarb.toml` declares a one-package workspace:

```toml
[workspace]
members = ["contracts"]

[workspace.package]
edition = "2024_07"
cairo-version = "2.15.0"

[workspace.dependencies]
starknet = "2.15.0"
dojo = "1.8.0"
dojo_cairo_test = "1.8.0"
cairo_test = "2.15.0"
```

It also defines empty Scarb profiles named `dev`, `sepolia`, `mainnet`, and `slot`. The profile-specific network/world details are not in Scarb; they are in `dojo_*.toml`.

`contracts/Scarb.toml` is the Cairo package:

```toml
[[target.starknet-contract]]
sierra = true
casm = true
build-external-contracts = ["dojo::world::world_contract::world"]

[tool.scarb]
allow-prebuilt-plugins = ["dojo_cairo_macros"]
```

The important Dojo-specific points:

- It depends on `dojo`.
- It uses the Dojo Cairo macros plugin.
- It builds the Dojo world contract as an external contract.
- `sozo build` produces compiled classes under `target/<profile>/`.

## Dojo World Profiles

Each environment has a separate `dojo_*.toml`. These configs define the world metadata, namespace, writers, RPC target, and system `dojo_init` calldata.

### Local Dev: `dojo_dev.toml`

```toml
[world]
name = "Zordle"
description = "Lazy adversarial Wordle on Dojo"
seed = "zordle_dev_0_1"

[namespace]
default = "zordle_0_1"

[writers]
"zordle_0_1" = ["zordle_0_1-actions", "zordle_0_1-setup"]

[init_call_args]
"zordle_0_1-setup" = ["0x0"]
"zordle_0_1-actions" = ["0x0", "0x0", "0x1", "0x0"]
```

Key meaning:

- `seed` determines the world address. Changing it creates a fresh world.
- `namespace.default` prefixes model and contract tags, for example `zordle_0_1-actions`.
- `[writers]` grants the `actions` and `setup` contracts permission to write all models in the namespace.
- `setup` receives one init arg: the dictionary admin address.
- `actions` receives four init args:
  - creator address
  - Denshokan/MinigameToken address
  - optional renderer encoded as `0x1` for `Option::None`
  - VRF provider address

The checked-in local profile keeps these as zero/placeholders. `scripts/dev_up.sh` patches the setup admin to Katana's first prefunded account before migration, then restores the file.

### Practice Slot: `dojo_slot.toml`

The slot profile targets Cartridge's Katana slot:

```toml
[env]
rpc_url = "https://api.cartridge.gg/x/zordle-practice-slot/katana"
```

It has the same namespace and writers as dev. `scripts/deploy_slot.sh` patches:

- `rpc_url`
- actions creator address
- setup admin address

Practice slot keeps `vrf_address = 0x0`, so the contract uses deterministic local pseudo-randomness instead of Cartridge VRF.

### Sepolia/Mainnet: `dojo_sepolia.toml` and `dojo_mainnet.toml`

These profiles target Cartridge-managed public RPCs:

- Sepolia: `https://api.cartridge.gg/x/starknet/sepolia`
- Mainnet: `https://api.cartridge.gg/x/starknet/mainnet/rpc/v0_9`

They use nonzero Denshokan and VRF addresses. The deploy scripts patch only the deployer-sensitive creator/setup-admin values, so private keys and account-specific state never live in the Dojo config.

Mainnet has an extra script-level guard: `deploy_mainnet.sh` refuses to run unless `dojo_mainnet.toml` points at the expected mainnet Denshokan address.

## Katana Setup

Local Katana is configured by `katana_dev.toml`:

```toml
[dev]
dev = true
no_fee = true

[server]
http_cors_origins = "*"
timeout = 300

[starknet]
env.invoke_max_steps = 25000000
```

This makes local txs fee-free, allows browser CORS, and raises invoke step limits for the expensive Wordle guess computation.

`katana_slot.toml` adds:

```toml
[cartridge]
controllers = true
paymaster = true
```

That is for Cartridge slot deployments, not the plain local `dev_up.sh` flow.

## Cairo Architecture

### Module Root

`contracts/src/lib.cairo` exposes modules:

```cairo
pub mod constants;
pub mod store;

pub mod interfaces { pub mod vrf; }
pub mod helpers { ... }
pub mod models { ... }
pub mod systems { ... }
```

### Models

All Dojo models are in `contracts/src/models/index.cairo` and use `#[dojo::model]`.

Models:

- `Dictionary`
  - key: `id`
  - fields: `word_count`, `answer_count`, `loaded`
  - singleton row keyed by `DICTIONARY_ID = 0`
- `WordPack`
  - key: `id`
  - field: `packed`
  - stores ten packed 5-letter words per `u256`
- `Game`
  - key: `id`
  - fields: player, timestamps, guess count, win/final word, mode, answer count, active candidate chunk mask
- `ActiveGame`
  - key: `player`
  - field: `game_id`
  - tracks unfinished practice game per player
- `CandidateChunk`
  - composite key: `(game_id, index)`
  - field: `bits`
  - sharded candidate bitmap
- `Guess`
  - composite key: `(game_id, index)`
  - fields: `word_id`, `pattern`, `candidates_remaining`
  - append-only turn log

The manifest shows these as tags:

```text
zordle_0_1-ActiveGame
zordle_0_1-CandidateChunk
zordle_0_1-Dictionary
zordle_0_1-Game
zordle_0_1-Guess
zordle_0_1-WordPack
```

For our RPG conversion, this maps naturally to models like:

- `Run`
- `EncounterProgress`
- `ChoiceLog`
- `Character`
- `InventoryItem`
- `EquippedItem`
- `RewardChoice`

Keep in mind that Dojo model schema changes are migration-sensitive. The Zordle runbook notes that adding/removing fields can require bumping the world seed and redeploying a fresh world.

### Store Facade

`contracts/src/store.cairo` wraps `WorldStorage` with typed helpers:

```cairo
fn game(self: @Store, id: felt252) -> Game {
    self.world.read_model(id)
}

fn set_game(mut self: Store, model: @Game) {
    self.world.write_model(model);
}

fn candidate(self: @Store, game_id: felt252, index: u8) -> CandidateChunk {
    self.world.read_model((game_id, index))
}
```

This is a useful pattern to copy. Systems never manually repeat `read_model` key shapes everywhere; they call small typed helpers.

For our RPG, this facade should be the place that knows model keys:

- run id
- player address
- level/encounter indexes
- item ids
- choice indexes

### Systems

There are two Dojo contracts under `contracts/src/systems`.

#### `setup.cairo`

`setup` is an admin/content-loading system. Its interface:

```cairo
fn load_word_packs(ref self: T, start_pack_id: u16, packs: Array<u256>);
fn reset_dictionary(ref self: T);
fn finalize_dictionary(ref self: T, expected_count: u16, answer_count: u16);
```

It also has `dojo_init(admin_address)`, which stores the admin and initializes the empty `Dictionary` singleton.

Important pattern:

- Big static content is loaded after deployment through a setup/admin system.
- The setup system is granted writer permissions in `dojo_*.toml`.
- The client does not call this system.

For our RPG, if content is too large for constructor/init calldata, copy this pattern for loading encounter tables, boss data, and item definitions. If content is small, we may keep it in Cairo constants instead.

#### `actions.cairo`

`actions` is the main gameplay system. It contains:

- Public write interface:
  - `start_practice() -> felt252`
  - `start_game(token_id)`
  - `guess(game_id, word_id)`
- Public read interface:
  - `get_game(game_id)`
  - `get_chunk(game_id, index)`
  - `get_guess(game_id, index)`
  - `get_word(word_id)`
  - `get_dictionary()`
  - `active_game_id(player)`
- Embedded Minigame/Denshokan component for NFT mode.
- Embedded SRC5 component.
- VRF address storage.

Critical design choice: the client reads through view functions on `actions` instead of reading Dojo model storage directly or subscribing through Torii. This keeps frontend decoding simple and makes the action contract the stable API surface.

For our RPG, this suggests exposing views like:

- `get_run(run_id)`
- `get_player_active_run(player)`
- `get_current_encounter(run_id)`
- `get_choice(run_id, encounter_index, choice_index)`
- `get_reward_options(run_id)`
- `get_inventory(run_id, cursor)`
- `get_effective_stats(run_id)`
- `get_equipment(run_id)`

## Local Dev Lifecycle

The local command is:

```bash
scripts/dev_up.sh
```

Actual script behavior:

1. Sets `RPC=http://localhost:5050`.
2. Stops any previous Katana process recorded in `.dev/katana.pid`.
3. Starts Katana:

   ```bash
   katana --config "$ROOT/katana_dev.toml"
   ```

4. Polls `starknet_chainId` until RPC is live.
5. Extracts first prefunded `ACCOUNT` and `PRIVKEY` from the Katana log, unless `ACCOUNT_ADDRESS` and `PRIVATE_KEY` are already set.
6. Copies `dojo_dev.toml` to `.dev/dojo_dev.toml.bak`.
7. Patches `dojo_dev.toml` so `zordle_0_1-setup` receives the prefunded account as admin.
8. Runs:

   ```bash
   sozo build
   sozo migrate --rpc-url "$RPC" --account-address "$ACCOUNT" --private-key "$PRIVKEY"
   ```

9. Reads `manifest_dev.json` with `jq`:

   ```bash
   WORLD=$(jq -r '.world.address' "$MANIFEST")
   ACTIONS=$(jq -r '.contracts[] | select(.tag == "zordle_0_1-actions") | .address' "$MANIFEST")
   SETUP=$(jq -r '.contracts[] | select(.tag == "zordle_0_1-setup") | .address' "$MANIFEST")
   ```

10. Writes `client/.env.local` with local RPC, namespace, chain ids, and actions address.
11. Checks whether the dictionary is already loaded by calling `get_dictionary` through `sozo call`.
12. If needed, installs script deps and runs `scripts/load_dictionary.mjs`.
13. Prints:

   ```text
   Ready. Run:  cd client && pnpm dev
   Then open:   http://localhost:5173
   ```

Important precision: the README and `docs/deploy.md` mention Torii and Vite, but `scripts/dev_up.sh` does not start Torii and does not start the Vite server. The current client does not use Torii. It only needs Katana RPC plus the deployed actions address.

## Manifest And Address Resolution

Dojo writes generated manifests such as `manifest_dev.json`. The manifest contains:

- world address and seed
- deployed system contracts and tags
- system entrypoints
- model schemas
- init calldata

Example local contracts:

```json
{
  "tag": "zordle_0_1-actions",
  "address": "0x6635...",
  "systems": ["dojo_init", "start_practice", "start_game", "guess", "upgrade"],
  "init_calldata": ["0x0", "0x0", "0x1", "0x0"]
}
```

Client manifest loading is in `client/src/manifest.ts`:

```ts
const manifests = import.meta.glob<DojoManifest>("../../manifest_*.json", {
  eager: true,
  import: "default",
});
```

`contractAddressFromManifest(profile, namespace, contractName)` builds a tag like:

```ts
`${namespace}-${contractName}`
```

For example:

```text
zordle_0_1-actions
```

Then it returns the matching contract address.

There is one local-dev wrinkle: `dev_up.sh` writes `VITE_PUBLIC_ACTIONS_ADDRESS_*` directly to `client/.env.local`. In `networkConfig.ts`, practice mode prefers env addresses before manifests, so local dev does not depend on importing `manifest_dev.json`. NFT mode prefers manifest lookup by profile first, then env fallback.

## Frontend Network Configuration

`client/src/networkConfig.ts` defines:

```ts
export type ZordleNetwork = {
  mode: "practice" | "nft";
  rpcUrl: string;
  chainId: string;
  actionsAddress: string;
  vrfAddress: string;
  namespace: string;
  slot?: string;
};
```

It builds two network objects:

- `PRACTICE_NETWORK`
- `NFT_NETWORK`

Selection:

```ts
export const networkForMode = (mode: GameMode): ZordleNetwork =>
  mode === "practice" ? PRACTICE_NETWORK : NFT_NETWORK;
```

Provider creation:

```ts
export const providerForNetwork = (network: ZordleNetwork) =>
  new RpcProvider({ nodeUrl: network.rpcUrl });
```

Local `.env.local` written by `dev_up.sh` sets both practice and NFT values to Katana:

```env
VITE_PUBLIC_NODE_URL=http://localhost:5050
VITE_PUBLIC_NODE_URL_PRACTICE=http://localhost:5050
VITE_PUBLIC_NODE_URL_NFT=http://localhost:5050
VITE_PUBLIC_CHAIN_ID_PRACTICE=KATANA
VITE_PUBLIC_CHAIN_ID_NFT=KATANA
VITE_PUBLIC_ACTIONS_ADDRESS_PRACTICE=<manifest_dev actions>
VITE_PUBLIC_ACTIONS_ADDRESS_NFT=<manifest_dev actions>
VITE_PUBLIC_VRF_ADDRESS_PRACTICE=0x0
VITE_PUBLIC_VRF_ADDRESS_NFT=0x0
```

For our RPG conversion, create a similar `networkConfig.ts`, but rename concepts to game-neutral names:

- `ACTIONS_ADDRESS` or `SYSTEMS_ADDRESS`
- `WORLD_ADDRESS`
- `RPC_URL`
- `CHAIN_ID`
- `VRF_ADDRESS` only if needed

## Client Read Path

Read wrappers live in `client/src/chain/views.ts`.

All reads use a read-only `RpcProvider`:

```ts
const view = async (
  network: ZordleNetwork,
  entrypoint: string,
  calldata: any[],
): Promise<string[]> =>
  providerForNetwork(network).callContract({
    contractAddress: network.actionsAddress,
    entrypoint,
    calldata: CallData.compile(calldata),
  });
```

Specific views:

```ts
getDictionary(network)
getGame(network, tokenId)
getGuess(network, tokenId, index)
getCandidateChunk(network, gameId, index)
getActiveGameId(network, player)
```

Return values are raw felts, decoded in `client/src/chain/state.ts`.

Example `Game` decoder:

```ts
export function decodeGame(felts: string[]): Game {
  return {
    id: BigInt(felts[0]),
    player: BigInt(felts[1]),
    startedAt: BigInt(felts[2]),
    endedAt: BigInt(felts[3]),
    guessesUsed: Number(BigInt(felts[4])),
    won: BigInt(felts[5]) !== 0n,
    finalWordId: Number(BigInt(felts[6])),
    mode: Number(BigInt(felts[7])),
    answerCount: Number(BigInt(felts[8] ?? "0")),
    activeChunks: BigInt(felts[9] ?? "0") + (BigInt(felts[10] ?? "0") << 128n),
  };
}
```

Notes:

- `u256` returns as low/high felts and must be reconstructed.
- Booleans are nonzero felts.
- Struct field order must match the Cairo model/view return order.
- There are no generated TypeScript bindings here. The client manually compiles calldata and manually decodes felts.

For our RPG, manual decoders are acceptable for a small API, but generated bindings or a stricter schema layer may be worth adding if model count grows.

## Client Write Path

Write-call builders live in `client/src/chain/contractSystems.ts`.

Practice start:

```ts
export const startPractice = async (network, account) =>
  account.execute([
    {
      contractAddress: network.actionsAddress,
      entrypoint: "start_practice",
      calldata: [],
    },
  ]);
```

NFT start:

```ts
export const startNftGame = async (network, account, tokenId) =>
  account.execute([
    {
      contractAddress: network.actionsAddress,
      entrypoint: "start_game",
      calldata: CallData.compile([tokenId]),
    },
  ]);
```

Guess:

```ts
export const submitGuess = async (
  network,
  account,
  gameId,
  tokenId,
  guessesUsed,
  wordId,
) => {
  const calls = [
    {
      contractAddress: network.actionsAddress,
      entrypoint: "guess",
      calldata: CallData.compile([gameId, wordId]),
    },
  ];

  if (tokenId !== null && !isZeroAddress(network.vrfAddress)) {
    calls.unshift(buildVrfRequestCall(network, network.actionsAddress, salt));
  }

  return account.execute(calls);
};
```

The UI waits for execution and then re-reads state:

```ts
const tx = await submitGuess(...);
await waitForSuccess(account, tx.transaction_hash);
const g = await getGuess(network, gameId, guessesUsed);
const game = await getGame(network, gameId);
```

This is the right mental model for our conversion:

1. Submit action tx.
2. Wait for tx success.
3. Re-read canonical state from chain.
4. Update React state from the decoded chain state.

Do not have the UI independently decide gameplay outcomes after sending the tx. It can optimistically show pending state, but the final state should come from chain reads.

## Account Strategy

`client/src/gameAccount.tsx` chooses the account implementation.

Practice mode:

- Creates/restores a burner account via `getOrCreateBurner(provider)`.
- The burner is stored in `localStorage`.
- If no burner exists, it deploys an OpenZeppelin account to the configured RPC.

`client/src/burnerAccount.ts` flow:

1. Generate private key with `stark.randomAddress()`.
2. Derive public key.
3. Compute account address with `hash.calculateContractAddressFromHash`.
4. Create `new Account({ provider, address, signer: privateKey })`.
5. Deploy account with `account.deployAccount`.
6. Store `{ address, privateKey }` in localStorage.

This works locally because Katana is `no_fee = true`, and on the Cartridge practice slot because the slot config/paymaster setup supports this style.

NFT mode:

- Uses `@starknet-react/core` `useAccount`, `useConnect`.
- Uses Cartridge Controller connector from `client/src/cartridgeConnector.ts`.
- The connector defines session policies for allowed methods:
  - `actions.start_game`
  - `actions.guess`
  - `actions.mint_game`
  - `vrf.request_random`

For our RPG, if we want fast local iteration, copy practice/burner mode first. Cartridge Controller can be added later for hosted play or account abstraction UX.

## Cartridge Controller Setup

`client/src/main.tsx` wraps the app in `StarknetConfig`:

```tsx
<StarknetConfig
  autoConnect
  chains={[defaultChain]}
  connectors={[cartridgeConnector]}
  defaultChainId={defaultChain.id}
  explorer={voyager}
  provider={jsonRpcProvider({ rpc: () => ({ nodeUrl: NFT_NETWORK.rpcUrl }) })}
>
  <App />
</StarknetConfig>
```

`client/src/cartridgeConnector.ts` creates:

```ts
const policies = {
  contracts: {
    [VRF_ADDRESS]: {
      description: "Cartridge VRF - random number generation",
      methods: [{ name: "Request random", entrypoint: "request_random" }],
    },
    [ACTIONS_ADDRESS]: {
      description: "Zordle actions - game lifecycle + guesses",
      methods: [
        { name: "Start game", entrypoint: "start_game" },
        { name: "Guess", entrypoint: "guess" },
        { name: "Mint game", entrypoint: "mint_game" },
      ],
    },
  },
};
```

This is important because Controller session keys can only call methods allowed by policy. If our RPG adds actions such as `choose_option`, `choose_reward`, or `equip_item`, they must be added to the Controller policies.

## Randomness

Zordle supports two randomness modes:

- Local/practice with `vrf_address = 0x0`: deterministic pseudo-random hash inside the contract.
- Sepolia/mainnet with nonzero Cartridge VRF address.

The Cairo helper is `contracts/src/helpers/random.cairo`:

```cairo
pub fn random_from(vrf_address: ContractAddress, salt: felt252) -> felt252 {
    if vrf_address.is_zero() {
        pseudo_random(salt)
    } else {
        vrf_random(vrf_address, salt)
    }
}
```

For VRF mode, the client prepends `request_random` to the multicall before `guess`. The contract later calls `consume_random` with the same salt.

Salt convention:

```ts
poseidon(game_id, guesses_used, word_id)
```

and in Cairo:

```cairo
poseidon_hash_span([game_id, game.guesses_used.into(), word_id.into()].span())
```

For Build Aura, the product principle says deterministic seed plus same choices should produce the same run. That points away from external VRF for core progression. A better fit is a stored run seed plus deterministic per-step hashing in Cairo, similar to Zordle's local fallback but without timestamp/tx hash in the gameplay RNG path after run creation.

## Content Loading

Zordle has a large dictionary, so it loads content after migration.

`scripts/load_dictionary.mjs`:

- Reads answer and guess word files.
- Packs ten words per `u256`.
- Creates `RpcProvider` and `Account`.
- Calls `setup.load_word_packs(start_pack_id, packs)` in batches.
- Calls `setup.finalize_dictionary(total, answer_count)`.
- Writes the same word order to `client/public/words.txt`.

Important pattern:

- The frontend and contract agree on ids because both use the same ordered content file.
- The setup system verifies load completeness before marking content loaded.
- Reloading content can invalidate existing games because ids may point to new meanings.

For our RPG, prefer small stable integer ids for content:

- encounter id
- item id
- boss id
- reward table id

If content can fit in Cairo constants, avoid a loader at first. If it cannot, build a setup loader with an explicit `finalize_content(version, counts...)` step.

## Local Dev Client Flow

After `scripts/dev_up.sh`, run:

```bash
cd starknet_reference/zordle/client
pnpm dev
```

Vite uses `envDir: "."` and `envPrefix: "VITE_PUBLIC_"`, so `client/.env.local` is loaded.

At runtime:

1. `App.tsx` fetches `/words.txt`.
2. It calls `getDictionary(networkForMode("practice"))`.
3. Route `/play` enters practice mode.
4. `useGameAccount("practice")` creates/restores a burner account.
5. The app calls `getActiveGameId`.
6. If none exists, it calls `start_practice`.
7. It waits for tx success.
8. It re-reads `active_game_id`, `get_game`, and `get_dictionary`.
9. On each submitted word, it calls `submitGuess`, waits, then re-reads `get_guess` and `get_game`.

No local Torii indexer is required in this architecture.

## What To Copy For Build Aura

Recommended skeleton:

```text
contracts/src/
  constants.cairo
  lib.cairo
  store.cairo
  models/
    index.cairo
    run.cairo
    character.cairo
    inventory.cairo
  systems/
    actions.cairo
    setup.cairo        optional content loader
  helpers/
    rng.cairo
    stats.cairo
    rewards.cairo
```

Dojo config:

```toml
[world]
name = "Build Aura"
seed = "build_aura_dev_v1"

[namespace]
default = "build_aura"

[writers]
"build_aura" = ["build_aura-actions", "build_aura-setup"]
```

Client chain module:

```text
src/lib/chain/
  networkConfig.ts
  manifest.ts
  account.ts
  systems.ts
  views.ts
  state.ts
```

Gameplay tx flow:

- `start_run(seed)`
- `choose_option(run_id, encounter_index, option_index)`
- `choose_reward(run_id, reward_index)`
- `equip_item(run_id, inventory_index)`

Read flow:

- `get_run(run_id)`
- `get_active_run(player)`
- `get_character(run_id)`
- `get_current_encounter(run_id)`
- `get_choice_result(run_id, encounter_index)`
- `get_reward_options(run_id)`
- `get_inventory(run_id, start, limit)`
- `get_equipment(run_id)`

## Design Implications For A TS-to-Dojo Conversion

Zordle's best conversion lesson is that the UI should become a renderer and transaction dispatcher. The game engine moves on-chain.

For our RPG:

- The current TypeScript engine should be translated into pure Cairo helpers and systems.
- React should not calculate pass/fail, damage, stat gain, rewards, boss gates, or progression.
- React may calculate display-only previews if they are derived from exposed chain state, but final outcomes must come from chain state after tx confirmation.
- All randomness should be centralized in Cairo.
- The same seed and choices should replay deterministically.
- Models should encode domain concepts directly instead of loose dynamic objects.

## Gotchas And Mismatches

- The docs say `dev_up.sh` boots Katana + Torii + dev client, but it only starts Katana and prints the command for Vite. There is no Torii startup in the script.
- The client reads via actions contract views, not Torii or direct Dojo model queries.
- Manual felt decoding is brittle. Field order changes in Cairo require matching TypeScript decoder updates.
- `u256` values return as low/high felts in JS.
- Controller policies must be updated whenever new write entrypoints are added.
- Model schema changes may require a new world seed.
- Reloading id-based content can invalidate active game rows.
- Local burner account creation assumes the local/slot chain can fund or accept the deploy. Plain public networks need a real account/funding flow.
- `manifest_dev.json` is local and machine-specific. Do not hardcode its addresses.

## Minimal Local Reference Commands

From `starknet_reference/zordle`:

```bash
scripts/dev_up.sh
cd client
pnpm dev
```

Useful manual checks:

```bash
sozo build
sozo migrate --rpc-url http://localhost:5050 --account-address <ACCOUNT> --private-key <KEY>
sozo call --rpc-url http://localhost:5050 <ACTIONS> get_dictionary
sozo execute --rpc-url http://localhost:5050 --account-address <ACCOUNT> --private-key <KEY> <ACTIONS> start_practice
```

For our repo, a similar local script should:

1. Start Katana.
2. Patch local Dojo init args.
3. `sozo build`.
4. `sozo migrate`.
5. Extract world/actions/setup addresses from `manifest_dev.json`.
6. Write frontend `.env.local`.
7. Optionally load content.
8. Print the client dev-server command.


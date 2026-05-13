#!/usr/bin/env bash
# Boots local Katana, migrates the Dojo world, and writes root .env.local for
# the Vite client. After this completes:
#
#   npm run dev
#
# Requires: katana, sozo, curl, jq.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
export PATH="$HOME/.asdf/shims:$PATH"

LOG_DIR="$ROOT/.dev"
mkdir -p "$LOG_DIR"
KATANA_LOG="$LOG_DIR/katana.log"
PID_FILE="$LOG_DIR/katana.pid"
RPC="${STARKNET_RPC_URL:-http://localhost:5050}"
NAMESPACE="gravenhold"
DEFAULT_KATANA_ACCOUNT="0x127fd5f1fe78a71f8bcd1fec63e3fe2f0486b6ecd5c86a0466c3a21fa5cfcec"
DEFAULT_KATANA_PRIVATE_KEY="0xc5b2fcab997346f3ea1c00b002ecf6f382c5f9c9659a3894eb783c5320f912"

command_or_asdf() {
  local name="$1"
  if command -v "$name" >/dev/null 2>&1; then
    printf '%s' "$name"
  else
    printf 'asdf exec %s' "$name"
  fi
}

KATANA_CMD="${KATANA_CMD:-$(command_or_asdf katana)}"
SOZO_CMD="${SOZO_CMD:-$(command_or_asdf sozo)}"

if ! command -v jq >/dev/null 2>&1; then
  echo "ERROR: jq is required to read manifest_dev.json."
  exit 1
fi

# --- 1. (re)start Katana --------------------------------------------------

if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "Stopping existing Katana (pid $(cat "$PID_FILE"))"
  kill "$(cat "$PID_FILE")" || true
  sleep 1
fi

echo "Starting Katana..."
: > "$KATANA_LOG"
nohup $KATANA_CMD --config "$ROOT/katana_dev.toml" >> "$KATANA_LOG" 2>&1 &
KATANA_PID=$!
echo "$KATANA_PID" > "$PID_FILE"
disown "$KATANA_PID" 2>/dev/null || true

for _ in {1..60}; do
  if curl -sf -X POST -H 'content-type: application/json' \
       --data '{"jsonrpc":"2.0","method":"starknet_chainId","params":[],"id":1}' \
       "$RPC" >/dev/null 2>&1; then
    break
  fi
  sleep 0.5
done

if ! curl -sf -X POST -H 'content-type: application/json' \
     --data '{"jsonrpc":"2.0","method":"starknet_chainId","params":[],"id":1}' \
     "$RPC" >/dev/null 2>&1; then
  echo "ERROR: Katana did not come up. Tail of $KATANA_LOG:"
  tail -40 "$KATANA_LOG"
  exit 1
fi

# --- 2. extract first prefunded account ----------------------------------

scrape_account() {
  grep -i -A1 'account address' "$KATANA_LOG" \
    | grep -oE '0x[0-9a-fA-F]{40,66}' \
    | head -1 || true
}

scrape_private_key() {
  grep -i -A1 'private key' "$KATANA_LOG" \
    | grep -oE '0x[0-9a-fA-F]{40,66}' \
    | head -1 || true
}

ACCOUNT="${ACCOUNT_ADDRESS:-}"
PRIVKEY="${PRIVATE_KEY:-}"

if [[ -z "$ACCOUNT" || -z "$PRIVKEY" ]]; then
  for _ in {1..20}; do
    ACCOUNT="${ACCOUNT:-$(scrape_account)}"
    PRIVKEY="${PRIVKEY:-$(scrape_private_key)}"
    if [[ -n "$ACCOUNT" && -n "$PRIVKEY" ]]; then
      break
    fi
    sleep 0.25
  done
fi

if [[ -z "$ACCOUNT" || -z "$PRIVKEY" ]]; then
  echo "Could not scrape account banner; using Katana seed-0 default account."
  ACCOUNT="$DEFAULT_KATANA_ACCOUNT"
  PRIVKEY="$DEFAULT_KATANA_PRIVATE_KEY"
fi

if [[ -z "$ACCOUNT" || -z "$PRIVKEY" ]]; then
  echo "ERROR: could not extract a prefunded account from $KATANA_LOG."
  echo "Set ACCOUNT_ADDRESS and PRIVATE_KEY env vars and re-run."
  exit 1
fi

echo "Account: $ACCOUNT"

# --- 3. build + migrate ---------------------------------------------------

echo "Building..."
$SOZO_CMD build

echo "Migrating world..."
$SOZO_CMD migrate \
  --rpc-url "$RPC" \
  --account-address "$ACCOUNT" \
  --private-key "$PRIVKEY" \
  2>&1 | tee "$LOG_DIR/migrate.log"

# --- 4. extract addresses from manifest ----------------------------------

MANIFEST="$ROOT/manifest_dev.json"
if [[ ! -f "$MANIFEST" ]]; then
  echo "ERROR: $MANIFEST not found after migrate."
  exit 1
fi

WORLD=$(jq -r '.world.address' "$MANIFEST")
ACTIONS=$(jq -r ".contracts[] | select(.tag == \"$NAMESPACE-actions\") | .address" "$MANIFEST")

if [[ -z "$WORLD" || "$WORLD" == "null" || -z "$ACTIONS" || "$ACTIONS" == "null" ]]; then
  echo "ERROR: could not extract world/actions from $MANIFEST."
  exit 1
fi

echo "World:   $WORLD"
echo "Actions: $ACTIONS"

# --- 5. write Vite env ----------------------------------------------------

cat > "$ROOT/.env.local" <<EOF
VITE_STARKNET_RPC_URL=$RPC
VITE_STARKNET_CHAIN_ID=KATANA
VITE_ACCOUNT_MODE=local
VITE_DOJO_PROFILE=dev
VITE_DOJO_NAMESPACE=$NAMESPACE
VITE_DOJO_WORLD_ADDRESS=$WORLD
VITE_DOJO_ACTIONS_ADDRESS=$ACTIONS
VITE_LOCAL_ACCOUNT_ADDRESS=$ACCOUNT
VITE_LOCAL_PRIVATE_KEY=$PRIVKEY
EOF

echo ""
echo "Ready. Run:  npm run dev"
echo "Then open:   http://localhost:5173"
echo ""
echo "Katana log:  $KATANA_LOG"
echo "Stop Katana: kill \$(cat $PID_FILE)"

#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

CONTAINER_NAME="${FIBERSCOPE_FIBER_CONTAINER:-fiberscope-real-fnn}"
DOCKER_IMAGE="${FIBER_DOCKER_IMAGE:-nervos/fiber:${FIBER_DOCKER_TAG:-0.9.0-rc7}}"
DATA_DIR="${FIBER_NODE_DATA_DIR:-/tmp/fiberscope-real-fnn}"
CONFIG_TEMPLATE="${FIBER_NODE_CONFIG_TEMPLATE:-$ROOT_DIR/infra/fiber-testnet/config.yml}"
SECRET_PASSWORD="${FIBER_SECRET_KEY_PASSWORD:-fiberscope-dev-secret}"

if [[ ! -f "$CONFIG_TEMPLATE" ]]; then
  echo "Fiber config template not found: $CONFIG_TEMPLATE" >&2
  exit 1
fi

mkdir -p "$DATA_DIR/ckb"

if [[ ! -f "$DATA_DIR/config.yml" ]]; then
  cp "$CONFIG_TEMPLATE" "$DATA_DIR/config.yml"
fi

if [[ ! -f "$DATA_DIR/ckb/key" ]]; then
  umask 077
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 32 > "$DATA_DIR/ckb/key"
  else
    od -An -tx1 -N32 /dev/urandom | tr -d ' \n' > "$DATA_DIR/ckb/key"
    printf '\n' >> "$DATA_DIR/ckb/key"
  fi
  chmod 600 "$DATA_DIR/ckb/key"
  echo "Generated throwaway testnet CKB key at $DATA_DIR/ckb/key"
fi

if docker ps --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
  echo "Fiber container already running: $CONTAINER_NAME"
elif docker ps -a --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
  docker start "$CONTAINER_NAME" >/dev/null
  echo "Started existing Fiber container: $CONTAINER_NAME"
else
  docker run \
    --name "$CONTAINER_NAME" \
    -d \
    --network host \
    -e "FIBER_SECRET_KEY_PASSWORD=$SECRET_PASSWORD" \
    -e "RUST_LOG=${RUST_LOG:-info}" \
    -v "$DATA_DIR:/fiber" \
    "$DOCKER_IMAGE" >/dev/null
  echo "Started Fiber container: $CONTAINER_NAME"
fi

echo "Fiber RPC: http://127.0.0.1:8227"
echo "Fiber data dir: $DATA_DIR"
echo "This helper is for local testnet development. Do not use this throwaway key flow for funded production nodes."

for _ in $(seq 1 30); do
  if curl -fsS \
    -H "content-type: application/json" \
    -d '{"jsonrpc":"2.0","id":1,"method":"node_info","params":[]}' \
    http://127.0.0.1:8227 >/tmp/fiberscope-fiber-node-info.json; then
    if command -v jq >/dev/null 2>&1; then
      jq '{version: .result.version, pubkey: .result.pubkey, peers_count: .result.peers_count}' \
        /tmp/fiberscope-fiber-node-info.json
    else
      cat /tmp/fiberscope-fiber-node-info.json
    fi
    exit 0
  fi
  sleep 1
done

echo "Fiber node started, but RPC did not become ready within 30 seconds." >&2
echo "Check logs with: docker logs -f $CONTAINER_NAME" >&2
exit 1

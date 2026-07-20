#!/bin/sh
set -eu

fiber_home="${FIBER_HOME:-/fiber}"
config_path="${FIBER_CONFIG:-$fiber_home/config.yml}"
config_template="${FIBER_CONFIG_TEMPLATE:-/app/infra/railway/fiber-config.yml}"
secret_password="${FIBER_SECRET_KEY_PASSWORD:-}"

if [ -z "$secret_password" ]; then
  echo "FIBER_SECRET_KEY_PASSWORD must be set." >&2
  exit 1
fi

mkdir -p "$fiber_home/ckb"

if [ ! -f "$config_path" ]; then
  cp "$config_template" "$config_path"
  echo "Copied Railway Fiber config to $config_path"
fi

# The Fiber config is persisted on the Railway volume. Keep the existing node
# identity/database, but migrate the RUSD auto-accept threshold for Dular's
# small-value browser wallet channels.
if grep -q 'auto_accept_amount: 1000000000' "$config_path"; then
  sed -i 's/auto_accept_amount: 1000000000/auto_accept_amount: 100000000/g' "$config_path"
  echo "Migrated RUSD auto_accept_amount to 100000000 base units"
fi

if [ ! -f "$fiber_home/ckb/key" ]; then
  umask 077
  openssl rand -hex 32 > "$fiber_home/ckb/key"
  chmod 600 "$fiber_home/ckb/key"
  echo "Generated testnet CKB key at $fiber_home/ckb/key"
fi

export FIBER_HOME="$fiber_home"
export FIBER_CONFIG="$config_path"
export FIBER_SECRET_KEY_PASSWORD="$secret_password"
export FIBER_RPC_URLS="${FIBER_RPC_URLS:-http://127.0.0.1:8227}"
export FIBERSCOPE_USE_SAMPLE_DATA="${FIBERSCOPE_USE_SAMPLE_DATA:-false}"

/usr/local/bin/docker-entrypoint.sh fnn &
fiber_pid="$!"
worker_pid=""
gateway_pid=""

shutdown() {
  if [ -n "$gateway_pid" ]; then
    kill "$gateway_pid" 2>/dev/null || true
  fi
  if [ -n "$worker_pid" ]; then
    kill "$worker_pid" 2>/dev/null || true
  fi
  kill "$fiber_pid" 2>/dev/null || true
  wait "$fiber_pid" 2>/dev/null || true
  if [ -n "$worker_pid" ]; then
    wait "$worker_pid" 2>/dev/null || true
  fi
  if [ -n "$gateway_pid" ]; then
    wait "$gateway_pid" 2>/dev/null || true
  fi
}
trap shutdown INT TERM

echo "Waiting for Fiber RPC at $FIBER_RPC_URLS"
for _ in $(seq 1 90); do
  if curl -fsS \
    -H "content-type: application/json" \
    -d '{"jsonrpc":"2.0","id":1,"method":"node_info","params":[]}' \
    http://127.0.0.1:8227 >/tmp/fiberscope-fiber-node-info.json; then
    cat /tmp/fiberscope-fiber-node-info.json
    break
  fi
  sleep 1
done

if ! test -s /tmp/fiberscope-fiber-node-info.json; then
  echo "Fiber RPC did not become ready." >&2
  kill "$fiber_pid" 2>/dev/null || true
  wait "$fiber_pid" 2>/dev/null || true
  exit 1
fi

pnpm db:push
pnpm --filter @fiberscope/worker start &
worker_pid="$!"

if [ "${DULAR_GATEWAY_ENABLED:-true}" = "true" ]; then
  node /app/infra/railway/dular-gateway.js &
  gateway_pid="$!"
fi

while kill -0 "$fiber_pid" 2>/dev/null && kill -0 "$worker_pid" 2>/dev/null; do
  if [ -n "$gateway_pid" ] && ! kill -0 "$gateway_pid" 2>/dev/null; then
    break
  fi
  sleep 5
done

shutdown
exit 1

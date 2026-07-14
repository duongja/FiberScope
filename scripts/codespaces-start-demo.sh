#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PROFILE="${1:-live-node}"
RUNTIME_DIR="${FIBERSCOPE_CODESPACES_RUNTIME_DIR:-$ROOT_DIR/.codespaces-runtime}"
LOG_DIR="$RUNTIME_DIR/logs"
PID_DIR="$RUNTIME_DIR/pids"
ENV_OUT="$RUNTIME_DIR/runtime.env"

case "$PROFILE" in
  demo)
    ENV_FILE=".env.demo"
    ;;
  live-node)
    if [[ -f ".env.live-node" ]]; then
      ENV_FILE=".env.live-node"
    else
      ENV_FILE=".env.live-node.example"
    fi
    ;;
  *)
    echo "Usage: $0 [demo|live-node]" >&2
    exit 1
    ;;
esac

mkdir -p "$LOG_DIR" "$PID_DIR"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Environment file not found: $ENV_FILE" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
if [[ -f ".env.codespaces.local" ]]; then
  # shellcheck disable=SC1091
  source ".env.codespaces.local"
fi
set +a

public_port_url() {
  local port="$1"
  if [[ -n "${CODESPACE_NAME:-}" && -n "${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-}" ]]; then
    printf "https://%s-%s.%s" "$CODESPACE_NAME" "$port" "$GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN"
  else
    printf "http://localhost:%s" "$port"
  fi
}

write_runtime_env_var() {
  local name="$1"
  printf "export %s=%q\n" "$name" "${!name:-}" >> "$ENV_OUT"
}

start_service() {
  local name="$1"
  local command="$2"
  local pid_file="$PID_DIR/$name.pid"
  local log_file="$LOG_DIR/$name.log"

  if [[ -f "$pid_file" ]]; then
    local existing_pid
    existing_pid="$(cat "$pid_file")"
    if [[ -n "$existing_pid" ]] && kill -0 "$existing_pid" 2>/dev/null; then
      echo "$name already running with PID $existing_pid"
      return
    fi
  fi

  echo "Starting $name..."
  setsid bash -lc "set -a; source '$ENV_OUT'; set +a; exec $command" >"$log_file" 2>&1 &
  echo "$!" > "$pid_file"
  echo "$name log: $log_file"
}

if command -v corepack >/dev/null 2>&1; then
  corepack enable >/dev/null 2>&1 || true
fi

if [[ ! -d "node_modules" ]]; then
  pnpm install --frozen-lockfile
fi

if [[ -f "scripts/codespaces-stop-demo.sh" ]]; then
  bash scripts/codespaces-stop-demo.sh --apps-only --quiet || true
fi

export WEB_PORT="${WEB_PORT:-3000}"
export API_PORT="${API_PORT:-8787}"
export API_HOST="${API_HOST:-0.0.0.0}"
export REDIS_URL="${REDIS_URL:-redis://localhost:6379}"
export FIBERSCOPE_SERVER_API_URL="${FIBERSCOPE_SERVER_API_URL:-http://127.0.0.1:${API_PORT}}"
export NEXT_PUBLIC_API_URL="${FIBERSCOPE_PUBLIC_API_URL:-$(public_port_url "$API_PORT")}"
WEB_PUBLIC_URL="${FIBERSCOPE_PUBLIC_WEB_URL:-$(public_port_url "$WEB_PORT")}"

if [[ "$PROFILE" == "live-node" ]]; then
  export FIBER_NODE_DATA_DIR="${FIBER_NODE_DATA_DIR:-$RUNTIME_DIR/fiber-node}"
  export FIBER_SECRET_KEY_PASSWORD="${FIBER_SECRET_KEY_PASSWORD:-fiberscope-codespaces-secret}"
  export FIBERSCOPE_USE_SAMPLE_DATA="${FIBERSCOPE_USE_SAMPLE_DATA:-false}"
  export FIBER_RPC_URLS="${FIBER_RPC_URLS:-http://127.0.0.1:8227}"
  scripts/start-fiber-testnet-node.sh
fi

docker compose up -d postgres redis
pnpm db:generate
pnpm db:push

: > "$ENV_OUT"
for name in \
  DATABASE_URL \
  REDIS_URL \
  FIBER_RPC_URLS \
  FIBER_GRAPH_POLL_INTERVAL_SECONDS \
  FIBERSCOPE_USE_SAMPLE_DATA \
  CKB_RPC_URL \
  CKB_INDEXER_URL \
  CKB_EXPLORER_BASE_URL \
  CKB_ENRICH_INTERVAL_SECONDS \
  FIBERSCOPE_ENABLE_REACHABILITY_PROBES \
  FIBERSCOPE_REACHABILITY_PROBE_INTERVAL_SECONDS \
  FIBERSCOPE_REACHABILITY_TIMEOUT_MS \
  FIBERSCOPE_REACHABILITY_PROBE_LIMIT \
  NEXT_PUBLIC_API_URL \
  FIBERSCOPE_SERVER_API_URL \
  API_PORT \
  API_HOST \
  WEB_PORT \
  LOG_LEVEL; do
  write_runtime_env_var "$name"
done
printf "export FIBERSCOPE_CODESPACES_PROFILE=%q\n" "$PROFILE" >> "$ENV_OUT"
printf "export FIBERSCOPE_PUBLIC_WEB_URL=%q\n" "$WEB_PUBLIC_URL" >> "$ENV_OUT"

start_service api "pnpm --filter @fiberscope/api dev"
start_service worker "pnpm --filter @fiberscope/worker dev"
start_service web "pnpm --filter @fiberscope/web dev"

echo
echo "FiberScope Codespaces profile: $PROFILE"
echo "Web: $WEB_PUBLIC_URL"
echo "API: $NEXT_PUBLIC_API_URL"
if [[ "$PROFILE" == "live-node" ]]; then
  echo "Fiber RPC: ${FIBER_RPC_URLS}"
fi
echo
echo "Run health checks with: pnpm codespaces:health"
echo "Stop background services with: pnpm codespaces:stop"
echo "Logs: $LOG_DIR"

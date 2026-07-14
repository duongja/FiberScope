#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

RUNTIME_DIR="${FIBERSCOPE_CODESPACES_RUNTIME_DIR:-$ROOT_DIR/.codespaces-runtime}"
ENV_FILE="$RUNTIME_DIR/runtime.env"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

API_PORT="${API_PORT:-8788}"
WEB_PORT="${WEB_PORT:-3000}"
API_LOCAL="${FIBERSCOPE_SERVER_API_URL:-http://127.0.0.1:${API_PORT}}"
WEB_LOCAL="http://127.0.0.1:${WEB_PORT}"

check_http() {
  local label="$1"
  local url="$2"
  if curl -fsS "$url" >/tmp/fiberscope-health-body 2>/tmp/fiberscope-health-error; then
    echo "ok   $label $url"
  else
    echo "fail $label $url"
    sed -n '1,3p' /tmp/fiberscope-health-error
    return 1
  fi
}

status=0
check_http "web" "$WEB_LOCAL" || status=1
check_http "api" "$API_LOCAL/health" || status=1

if [[ "${FIBERSCOPE_CODESPACES_PROFILE:-}" == "live-node" || "${FIBERSCOPE_USE_SAMPLE_DATA:-true}" == "false" ]]; then
  fiber_url="${FIBER_RPC_URLS%%,*}"
  if curl -fsS \
    -H "content-type: application/json" \
    -d '{"jsonrpc":"2.0","id":1,"method":"node_info","params":[]}' \
    "$fiber_url" >/tmp/fiberscope-health-fiber 2>/tmp/fiberscope-health-error; then
    echo "ok   fiber $fiber_url"
  else
    echo "fail fiber $fiber_url"
    sed -n '1,3p' /tmp/fiberscope-health-error
    status=1
  fi
fi

if [[ -n "${FIBERSCOPE_PUBLIC_WEB_URL:-}" ]]; then
  echo "web public: $FIBERSCOPE_PUBLIC_WEB_URL"
fi
if [[ -n "${NEXT_PUBLIC_API_URL:-}" ]]; then
  echo "api public: $NEXT_PUBLIC_API_URL"
fi

if [[ -d "$RUNTIME_DIR/pids" ]]; then
  for pid_file in "$RUNTIME_DIR/pids"/*.pid; do
    [[ -e "$pid_file" ]] || continue
    name="$(basename "$pid_file" .pid)"
    pid="$(cat "$pid_file")"
    if kill -0 "$pid" 2>/dev/null; then
      echo "ok   process $name pid=$pid"
    else
      echo "fail process $name pid=$pid"
      status=1
    fi
  done
fi

exit "$status"

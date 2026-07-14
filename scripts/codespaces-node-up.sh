#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

RUNTIME_DIR="${FIBERSCOPE_CODESPACES_RUNTIME_DIR:-$ROOT_DIR/.codespaces-runtime}"
PORT="${FIBERSCOPE_FIBER_RPC_PORT:-8227}"
HEARTBEAT_SECONDS="${FIBERSCOPE_NODE_HEARTBEAT_SECONDS:-60}"
WATCH="true"

usage() {
  cat <<EOF
Usage: pnpm codespaces:node [--watch|--detach]

Starts the disposable Fiber testnet node in GitHub Codespaces with persistent
workspace storage under .codespaces-runtime/fiber-node.

Options:
  --watch   Keep printing node health until Ctrl-C. This is the default.
  --detach  Start the Docker container, print URLs, and exit.

Environment:
  FIBERSCOPE_EXPOSE_FIBER_RPC=true|false   Try to mark port 8227 public with gh. Default: true.
  FIBER_NODE_DATA_DIR=/path/to/data         Override the persisted node data directory.
  FIBER_SECRET_KEY_PASSWORD=secret          Override the demo key encryption password.
EOF
}

if [[ "${1:-}" == "--" ]]; then
  shift
fi

case "${1:---watch}" in
  --watch | watch)
    WATCH="true"
    ;;
  --detach | detach)
    WATCH="false"
    ;;
  -h | --help | help)
    usage
    exit 0
    ;;
  *)
    usage >&2
    exit 1
    ;;
esac

if [[ -f ".env.codespaces.local" ]]; then
  set -a
  # shellcheck disable=SC1091
  source ".env.codespaces.local"
  set +a
fi

mkdir -p "$RUNTIME_DIR"

export FIBER_NODE_DATA_DIR="${FIBER_NODE_DATA_DIR:-$RUNTIME_DIR/fiber-node}"
export FIBER_SECRET_KEY_PASSWORD="${FIBER_SECRET_KEY_PASSWORD:-fiberscope-codespaces-demo}"
export FIBERSCOPE_FIBER_CONTAINER="${FIBERSCOPE_FIBER_CONTAINER:-fiberscope-real-fnn}"

public_port_url() {
  local port="$1"
  if [[ -n "${CODESPACE_NAME:-}" && -n "${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-}" ]]; then
    printf "https://%s-%s.%s" "$CODESPACE_NAME" "$port" "$GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN"
  else
    printf ""
  fi
}

mark_port_public() {
  if [[ "${FIBERSCOPE_EXPOSE_FIBER_RPC:-true}" != "true" ]]; then
    return 0
  fi
  if [[ -z "${CODESPACE_NAME:-}" ]]; then
    return 0
  fi
  if ! command -v gh >/dev/null 2>&1; then
    return 0
  fi

  if gh codespace ports visibility "$PORT:public" -c "$CODESPACE_NAME" >/dev/null 2>&1; then
    echo "Marked Codespaces port $PORT public."
  else
    echo "Could not automatically mark port $PORT public. Use the Codespaces Ports tab if remote access is needed."
  fi
}

node_info() {
  curl -fsS \
    -H "content-type: application/json" \
    -d '{"jsonrpc":"2.0","id":1,"method":"node_info","params":[]}' \
    "http://127.0.0.1:$PORT"
}

print_summary() {
  local public_url
  public_url="$(public_port_url "$PORT")"

  echo
  echo "Fiber node is running."
  echo "Local RPC:  http://127.0.0.1:$PORT"
  if [[ -n "$public_url" ]]; then
    echo "Public RPC: $public_url"
  else
    echo "Public RPC: unavailable outside Codespaces or until the port is forwarded"
  fi
  echo "Data dir:   $FIBER_NODE_DATA_DIR"
  echo "Container:  $FIBERSCOPE_FIBER_CONTAINER"
  echo
  echo "Use this as FIBER_RPC_URLS for FiberScope ingestion when the port is public:"
  if [[ -n "$public_url" ]]; then
    echo "FIBER_RPC_URLS=\"$public_url\""
  else
    echo "FIBER_RPC_URLS=\"http://127.0.0.1:$PORT\""
  fi
  echo
}

scripts/start-fiber-testnet-node.sh
mark_port_public
print_summary

if [[ "$WATCH" != "true" ]]; then
  exit 0
fi

echo "Watching node health every ${HEARTBEAT_SECONDS}s. Ctrl-C stops this monitor only; the Docker node keeps running."

while true; do
  if payload="$(node_info 2>/tmp/fiberscope-node-up-error.log)"; then
    if command -v jq >/dev/null 2>&1; then
      printf "[%s] " "$(date -Is)"
      jq -r '"ok version=\(.result.version) pubkey=\(.result.pubkey) peers=\(.result.peers_count) channels=\(.result.channel_count)"' <<<"$payload"
    else
      echo "[$(date -Is)] ok"
    fi
  else
    echo "[$(date -Is)] Fiber RPC unhealthy. Last error:"
    sed -n '1,3p' /tmp/fiberscope-node-up-error.log || true
    echo "Check logs with: docker logs -f $FIBERSCOPE_FIBER_CONTAINER"
  fi
  sleep "$HEARTBEAT_SECONDS"
done

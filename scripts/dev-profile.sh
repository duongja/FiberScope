#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PROFILE="${1:-demo}"

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
    ENV_FILE="$PROFILE"
    ;;
esac

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Environment file not found: $ENV_FILE" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

if [[ "${FIBERSCOPE_USE_SAMPLE_DATA:-true}" == "false" && -z "${FIBER_RPC_URLS:-}" ]]; then
  echo "FIBER_RPC_URLS is required when FIBERSCOPE_USE_SAMPLE_DATA=false" >&2
  exit 1
fi

echo "FiberScope profile: $PROFILE"
echo "Environment: $ENV_FILE"
echo "Database: ${DATABASE_URL}"
echo "API: ${NEXT_PUBLIC_API_URL:-http://localhost:${API_PORT:-8787}}"

if [[ "${FIBERSCOPE_USE_SAMPLE_DATA:-true}" == "false" ]]; then
  echo "Fiber RPC source(s): ${FIBER_RPC_URLS}"
else
  echo "Fiber RPC source(s): sample data"
fi

docker compose up -d postgres redis
pnpm db:generate
pnpm db:push

echo "Starting FiberScope apps. Web will be available on http://localhost:${WEB_PORT:-3000}."
exec pnpm dev

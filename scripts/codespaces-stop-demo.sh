#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

RUNTIME_DIR="${FIBERSCOPE_CODESPACES_RUNTIME_DIR:-$ROOT_DIR/.codespaces-runtime}"
PID_DIR="$RUNTIME_DIR/pids"
APPS_ONLY=false
QUIET=false

for arg in "$@"; do
  case "$arg" in
    --apps-only)
      APPS_ONLY=true
      ;;
    --quiet)
      QUIET=true
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      exit 1
      ;;
  esac
done

say() {
  if [[ "$QUIET" != "true" ]]; then
    echo "$@"
  fi
}

stop_pid_file() {
  local pid_file="$1"
  local name
  name="$(basename "$pid_file" .pid)"
  local pid
  pid="$(cat "$pid_file" 2>/dev/null || true)"
  if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
    say "Stopping $name ($pid)"
    kill -- "-$pid" 2>/dev/null || kill "$pid" 2>/dev/null || true
    for _ in $(seq 1 20); do
      if ! kill -0 "$pid" 2>/dev/null; then
        break
      fi
      sleep 0.2
    done
    if kill -0 "$pid" 2>/dev/null; then
      say "Force stopping $name ($pid)"
      kill -9 -- "-$pid" 2>/dev/null || kill -9 "$pid" 2>/dev/null || true
    fi
  fi
  rm -f "$pid_file"
}

if [[ -d "$PID_DIR" ]]; then
  for pid_file in "$PID_DIR"/*.pid; do
    [[ -e "$pid_file" ]] || continue
    stop_pid_file "$pid_file"
  done
else
  say "No Codespaces app PID directory found."
fi

if [[ "$APPS_ONLY" == "false" ]]; then
  say "Stopping Postgres and Redis containers"
  docker compose stop postgres redis >/dev/null 2>&1 || true

  container_name="${FIBERSCOPE_FIBER_CONTAINER:-fiberscope-real-fnn}"
  if docker ps --format '{{.Names}}' | grep -qx "$container_name"; then
    say "Stopping Fiber container $container_name"
    docker stop "$container_name" >/dev/null 2>&1 || true
  fi
fi

say "Codespaces demo services stopped."

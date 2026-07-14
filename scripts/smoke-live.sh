#!/usr/bin/env bash
set -euo pipefail

API_URL="${FIBERSCOPE_API_URL:-http://127.0.0.1:${API_PORT:-8788}}"
AMOUNT="${FIBERSCOPE_SMOKE_AMOUNT:-100000000}"
ASSET="${FIBERSCOPE_SMOKE_ASSET:-CKB}"

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required for the live smoke test." >&2
  exit 1
fi

echo "Checking FiberScope API: $API_URL"

sources_json="$(curl -fsS "$API_URL/api/ingestion/sources")"
real_source_count="$(jq '[.sources[] | select(.url != "sample://fiber" and (.snapshots[0].status == "COMPLETED"))] | length' <<<"$sources_json")"
sample_source_count="$(jq '[.sources[] | select(.url == "sample://fiber")] | length' <<<"$sources_json")"

if [[ "$real_source_count" -lt 1 ]]; then
  echo "No completed real Fiber RPC ingestion source found." >&2
  jq '.sources[] | {url, lastError, latestSnapshot: .snapshots[0]}' <<<"$sources_json" >&2
  exit 1
fi

if [[ "$sample_source_count" -gt 0 ]]; then
  echo "Sample source is present. This is not a clean live-node smoke test." >&2
  jq '.sources[] | {url, latestSnapshot: .snapshots[0]}' <<<"$sources_json" >&2
  exit 1
fi

summary_json="$(curl -fsS "$API_URL/api/network/summary")"
nodes="$(jq -r '.nodeCount' <<<"$summary_json")"
channels="$(jq -r '.channelCount' <<<"$summary_json")"
enabled="$(jq -r '.enabledDirectionCount' <<<"$summary_json")"

if [[ "$nodes" -lt 1 || "$channels" -lt 1 ]]; then
  echo "Live graph is empty." >&2
  jq '{nodeCount, channelCount, enabledDirectionCount}' <<<"$summary_json" >&2
  exit 1
fi

recommendations_json="$(curl -fsS "$API_URL/api/liquidity/recommendations?asset=$ASSET&amount=$AMOUNT")"
source_pubkey="$(jq -r '.recommendations[0].pubkey // empty' <<<"$recommendations_json")"
target_pubkey="$(jq -r '.recommendations[1].pubkey // empty' <<<"$recommendations_json")"

if [[ -z "$source_pubkey" || -z "$target_pubkey" ]]; then
  echo "Not enough liquidity recommendations to run a route smoke test." >&2
  jq '{recommendationCount: (.recommendations | length)}' <<<"$recommendations_json" >&2
  exit 1
fi

route_json="$(
  curl -fsS \
    "$API_URL/api/routes/estimate?source_pubkey=$source_pubkey&target_pubkey=$target_pubkey&asset=$ASSET&amount=$AMOUNT"
)"

echo "Live FiberScope smoke test passed."
jq -n \
  --arg apiUrl "$API_URL" \
  --arg source "$source_pubkey" \
  --arg target "$target_pubkey" \
  --argjson summary "$summary_json" \
  --argjson route "$route_json" \
  '{
    apiUrl: $apiUrl,
    sourcePubkey: $source,
    targetPubkey: $target,
    nodeCount: $summary.nodeCount,
    channelCount: $summary.channelCount,
    staleChannelCount: $summary.staleChannelCount,
    enabledDirectionCount: $summary.enabledDirectionCount,
    lastSnapshotAt: $summary.lastSnapshotAt,
    route: {
      canPay: $route.canPay,
      confidence: $route.confidence,
      hopCount: $route.hopCount,
      estimatedFee: $route.estimatedFee,
      warnings: $route.warnings
    }
  }'

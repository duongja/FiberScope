export const OPENAPI_DOCUMENT = {
  openapi: "3.1.0",
  info: {
    title: "FiberScope API",
    version: "0.1.0",
    description:
      "Read-only Fiber Network explorer, route-readiness, diagnostics, liquidity, and graph export API.",
  },
  paths: {
    "/health": {
      get: {
        summary: "Service health and indexed graph counts",
      },
    },
    "/api/network/summary": {
      get: {
        summary: "Current public graph summary",
      },
    },
    "/api/network/history": {
      get: {
        summary: "Recent ingestion snapshots",
        parameters: [queryParam("limit", "Maximum snapshots to return")],
      },
    },
    "/api/ingestion/sources": {
      get: {
        summary: "Configured graph ingestion sources and recent runs",
      },
    },
    "/api/assets": {
      get: {
        summary: "Indexed CKB and UDT assets",
      },
    },
    "/api/nodes": {
      get: {
        summary: "Search indexed Fiber nodes",
        parameters: [
          queryParam("q", "Pubkey or node name search"),
          queryParam("limit"),
          queryParam("offset"),
        ],
      },
    },
    "/api/nodes/{pubkey}": {
      get: {
        summary: "Node detail, channels, score, and reachability probes",
        parameters: [pathParam("pubkey", "Fiber node pubkey")],
      },
    },
    "/api/channels": {
      get: {
        summary: "Search indexed public channels",
        parameters: [
          queryParam("q"),
          queryParam("asset"),
          queryParam("limit"),
          queryParam("offset"),
        ],
      },
    },
    "/api/channels/{outpoint}": {
      get: {
        summary: "Channel detail by Fiber channel outpoint",
        parameters: [
          pathParam("outpoint", "URL-encoded Fiber channel outpoint"),
        ],
      },
    },
    "/api/routes/estimate": {
      get: {
        summary: "Estimate route readiness for a payment",
        parameters: routeQueryParams(),
      },
    },
    "/api/readiness/can-pay": {
      get: {
        summary: "Wallet-friendly alias for route readiness",
        parameters: routeQueryParams(),
      },
    },
    "/api/readiness/can-receive": {
      get: {
        summary:
          "Estimate whether a receiver has usable public inbound capacity",
        parameters: [
          queryParam("target_pubkey", "Receiver Fiber node pubkey", true),
          queryParam("asset", "Asset id or symbol"),
          queryParam("amount", "Amount in the asset smallest unit"),
        ],
      },
    },
    "/api/liquidity/recommendations": {
      get: {
        summary: "Rank public peers for channel opening and wallet bootstrap",
        parameters: [queryParam("asset"), queryParam("amount")],
      },
    },
    "/api/diagnostics/explain": {
      get: {
        summary: "Classify a Fiber failure message",
        parameters: [queryParam("message"), queryParam("code")],
      },
      post: {
        summary: "Classify a Fiber failure with optional route context",
      },
    },
    "/api/reachability/summary": {
      get: {
        summary: "Latest active reachability probe summary",
      },
    },
    "/api/export/graph.json": {
      get: {
        summary: "Download the normalized public graph as JSON",
      },
    },
    "/api/export/nodes.csv": {
      get: {
        summary: "Download indexed nodes as CSV",
      },
    },
    "/api/export/channels.csv": {
      get: {
        summary: "Download indexed channels as CSV",
      },
    },
    "/api/openapi.json": {
      get: {
        summary: "Download this API description",
      },
    },
  },
} as const;

function pathParam(name: string, description?: string) {
  return {
    name,
    in: "path",
    required: true,
    description,
    schema: { type: "string" },
  };
}

function queryParam(name: string, description?: string, required = false) {
  return {
    name,
    in: "query",
    required,
    description,
    schema: { type: "string" },
  };
}

function routeQueryParams() {
  return [
    queryParam("source_pubkey", "Sender Fiber node pubkey", true),
    queryParam("target_pubkey", "Receiver Fiber node pubkey", true),
    queryParam("asset", "Asset id or symbol"),
    queryParam("amount", "Amount in the asset smallest unit", true),
  ];
}

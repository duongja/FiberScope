# FiberScope Architecture

FiberScope is split into independent packages so other Fiber tools can reuse the RPC client, route engine, SDK, and API model without adopting the UI.

The `@fiberscope/sdk` package is the intended integration point for wallets and merchant services. It wraps the readiness, route estimate, liquidity recommendation, diagnostics, and network summary endpoints with typed methods.

## Data Flow

```txt
Fiber node RPC
  graph_nodes / graph_channels
        |
        v
apps/worker
        |
        +--> normalized graph data in Postgres
        +--> CKB outpoint enrichment
        +--> optional TCP reachability probes
        +--> node score refresh
        |
        v
apps/api
        |
        +--> explorer endpoints
        +--> route readiness
        +--> liquidity recommendations
        +--> failure diagnostics and ingestion observability
        +--> OpenAPI metadata and graph CSV/JSON exports
        |
        v
apps/web
```

## Public Graph Boundary

The public explorer is intentionally limited to announced graph data and on-chain evidence. It does not claim access to private Fiber payments, invoices, or exact private channel balances.

## Node Dependency

FiberScope needs at least one live Fiber node to refresh real network data, but browser users and SDK consumers do not need to run a node themselves. The worker talks to Fiber RPC, stores normalized snapshots in Postgres, and the API/UI read from that database.

If a Fiber node is temporarily unavailable, the API can continue serving the latest stored snapshot. Freshness is visible through ingestion source timestamps and snapshot status. For production, run multiple Fiber RPC sources through `FIBER_RPC_URLS` so the explorer is not coupled to a single node's availability.

## Route Estimates

Route estimates use enabled directional channel updates, asset matching, TLC minimum checks, public outbound liquidity when available, and a confidence score. Missing public outbound liquidity does not make a route impossible; it lowers confidence because the public graph cannot prove the channel can carry the amount.

## CKB Enrichment

The CKB enrichment package attempts to decode Fiber channel outpoints into CKB outpoints and query `get_live_cell`. If decoding or RPC lookup fails, the channel remains usable in the explorer but its on-chain status is marked as unavailable.

## Reachability Probes

Reachability probes are opt-in. The worker parses announced `/ip4`, `/ip6`, `/dns`, `/dns4`, and `/dns6` multiaddrs with `/tcp` ports, opens a short TCP connection, then stores success, latency, and error history. This is an operator signal, not a payment guarantee.

## Export Boundary

`/api/export/graph.json`, `/api/export/nodes.csv`, and `/api/export/channels.csv` expose normalized public graph data for external dashboards, notebooks, wallet readiness services, and monitoring tools. These exports intentionally preserve the same privacy boundary as the UI: public announcements, optional reachability results, and optional CKB funding evidence only.

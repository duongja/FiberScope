# FiberScope

FiberScope is an open-source network explorer, route-readiness engine, and liquidity intelligence API for Fiber Network.

It is designed for wallet builders first: it turns Fiber public graph data into practical answers such as "can this payment probably route?", "which nodes support this asset?", and "which public peer should a wallet open a channel with?"

## What FiberScope Shows

- Public Fiber nodes and channels.
- Public channel capacity by asset.
- Directional channel status, fee rates, TLC limits, and advertised outbound liquidity.
- Route estimates from the public graph.
- Wallet readiness APIs for paying, receiving, and peer recommendations.
- CKB on-chain enrichment for channel funding outpoints when available.
- Optional reachability probes for announced TCP multiaddrs.

## What FiberScope Does Not Show

FiberScope does not show private payments, private invoices, exact private channel balances, or private payment paths. Fiber payments are off-chain and private by design.

## Local Development

FiberScope has two local run modes:

- Demo mode uses sample graph data and does not require a Fiber node.
- Live-node mode ingests public graph data from one or more Fiber RPC endpoints.

Demo mode:

```sh
pnpm install
pnpm dev:demo
```

Live-node mode against a local Fiber node:

```sh
pnpm install
cp .env.live-node.example .env.live-node
pnpm fiber:testnet
pnpm dev:live
```

`pnpm fiber:testnet` starts a disposable testnet Fiber node with Docker and exposes RPC on `http://127.0.0.1:8227`. It is for local development only; production deployments should point `FIBER_RPC_URLS` at operator-managed Fiber nodes.

Manual setup is also available:

```sh
pnpm install
pnpm db:generate
cp .env.example .env
docker compose up postgres redis
pnpm db:push
pnpm seed
pnpm dev
```

Services:

- Web: http://localhost:3000
- API: http://localhost:8787
- Health: http://localhost:8787/health

For a one-command demo:

```sh
docker compose up
```

The worker can ingest live Fiber RPC data when `FIBER_RPC_URLS` is set. If `FIBERSCOPE_USE_SAMPLE_DATA=true`, it also seeds realistic sample graph data so the UI works without a local Fiber node.

See [docs/run-modes.md](docs/run-modes.md) for the full node dependency model, including cached-data behavior and hosted multi-node deployments.

For hackathon judging and operator deployment:

- [Codespaces demo runbook](docs/codespaces-demo.md)
- [Vercel Hobby deployment](docs/vercel-hobby.md)
- [Submission draft](docs/hackathon-submission.md)
- [Deployment runbook](docs/deployment.md)
- [Demo script](docs/demo.md)
- [Video script](docs/video-script.md)

Enable active reachability checks with:

```sh
FIBERSCOPE_ENABLE_REACHABILITY_PROBES=true pnpm --filter @fiberscope/worker dev
```

The prober only checks announced TCP multiaddrs, stores latency/error history, and feeds the node reachability score.

Validate a clean live-node run with:

```sh
pnpm smoke:live
```

## API Highlights

```txt
GET /api/network/summary
GET /api/network/history
GET /api/ingestion/sources
GET /api/nodes
GET /api/nodes/:pubkey
GET /api/channels
GET /api/channels/:outpoint
GET /api/reachability/summary
GET /api/routes/estimate
GET /api/liquidity/recommendations
GET /api/readiness/can-pay
GET /api/readiness/can-receive
GET /api/diagnostics/explain
POST /api/diagnostics/explain
GET /api/export/graph.json
GET /api/export/nodes.csv
GET /api/export/channels.csv
GET /api/openapi.json
```

## Wallet SDK

FiberScope includes `@fiberscope/sdk`, a small typed client for wallets and merchant services.

```ts
import { FiberScopeClient } from "@fiberscope/sdk";

const scope = new FiberScopeClient({ baseUrl: "http://localhost:8787" });

const readiness = await scope.canPay({
  sourcePubkey: "...",
  targetPubkey: "...",
  asset: "CKB",
  amount: "100000000",
});

const graph = await scope.graphExport();
const channelsCsv = await scope.channelsCsv();
```

## Architecture

```txt
Fiber RPC graph_nodes / graph_channels
        |
        v
Worker ingestion + CKB enrichment + reachability probes
        |
        v
Postgres
        |
        v
Fastify API ---- Next.js Explorer UI
        |
        v
Route Engine + Diagnostics + Wallet SDK
```

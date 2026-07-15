# FiberScope

FiberScope is open-source infrastructure for Fiber Network visibility, route readiness, liquidity intelligence, and payment-failure diagnostics.

Fiber Network exposes public graph data, but application builders still need a dependable layer that answers practical integration questions:

- Is the public graph fresh?
- Which nodes and channels are visible?
- Which assets have usable public capacity?
- Can this payment probably route before a wallet attempts it?
- Does a receiver appear to have inbound capacity?
- Which public peers are useful for channel opening?
- Why did a payment attempt fail, and what should an operator or wallet try next?

FiberScope turns public Fiber graph data into a reusable explorer, API, OpenAPI contract, route-readiness engine, diagnostics layer, and export surface.

## Live Instance

```txt
Web:     https://fiber-scope-web.vercel.app
API:     https://fiber-scope-api-six.vercel.app
Health:  https://fiber-scope-api-six.vercel.app/health
OpenAPI: https://fiber-scope-api-six.vercel.app/api/openapi.json
```

The hosted instance runs on real Fiber testnet graph data. A Railway service runs the Fiber node and ingestion worker, Supabase stores normalized graph snapshots, and Vercel serves the API and web UI. Fiber RPC is kept private inside the Railway service; public users consume the indexed database through FiberScope.

## Hackathon Fit

FiberScope targets the **Node, Routing, Cross-Chain, and Diagnostics Infrastructure** category.

It is not a consumer wallet, custodial service, or payment-sending application. It is reusable infrastructure for wallets, merchants, node operators, liquidity providers, and developer tools that need reliable access to Fiber public graph intelligence.

## What It Provides

- **Network explorer**: public nodes, channels, assets, directional channel state, fees, TLC limits, and stale graph indicators.
- **Network map**: configurable graph view for inspecting visible channels and topology.
- **Route readiness**: public-graph route estimates with confidence, hop count, estimated fees, and warnings.
- **Wallet readiness APIs**: `can-pay` and `can-receive` endpoints for wallet and merchant preflight checks.
- **Liquidity recommendations**: peer suggestions for channel opening, filtered by asset and amount.
- **Payment diagnostics**: structured explanations and recommended actions for common routing, liquidity, asset, and connectivity failures.
- **Search**: lookup across node pubkeys, channel outpoints, assets, and route-history values.
- **Observability**: ingestion source status, snapshot history, graph freshness, node counts, channel counts, and source errors.
- **CKB evidence**: optional enrichment for Fiber channel funding outpoints when CKB data is available.
- **Exports**: normalized public graph data as JSON and CSV.
- **OpenAPI**: machine-readable API contract for generated clients and integration tests.
- **TypeScript client**: lightweight SDK package for common FiberScope API calls.

## Privacy Boundary

FiberScope indexes public graph data and optional public CKB funding evidence. It does not expose private payments, private invoices, exact private channel balances, private routes, wallet keys, or payment preimages.

Route readiness is a public-graph estimate, not a payment guarantee. Missing advertised outbound liquidity lowers confidence because the public graph cannot prove that a channel can carry the amount.

## Architecture

```txt
Fiber node RPC
  graph_nodes / graph_channels
        |
        v
Worker ingestion
  normalize graph data
  enrich CKB outpoints
  run optional reachability probes
  refresh node scores
        |
        v
Postgres
        |
        v
Fastify API
  explorer endpoints
  route readiness
  liquidity recommendations
  diagnostics
  OpenAPI and exports
        |
        v
Next.js web UI
```

More detail: [docs/architecture.md](docs/architecture.md)

## Repository Structure

```txt
apps/api          Fastify API and OpenAPI endpoint
apps/web          Next.js explorer UI
apps/worker       Fiber graph ingestion, scoring, enrichment, probes
packages/db       Prisma client wrapper
packages/shared   Shared types, asset helpers, sample graph data
packages/fiber-rpc Fiber JSON-RPC client
packages/route-engine Route estimation and confidence scoring
packages/ckb-indexer CKB RPC/indexer enrichment helpers
packages/sdk      Lightweight TypeScript client
prisma            Database schema and seed data
infra             Fiber and Railway deployment files
```

## Run Locally

Demo mode uses sample graph data and does not require a Fiber node:

```sh
pnpm install
pnpm dev:demo
```

Open:

```txt
http://localhost:3000
```

Live-node mode runs against a local Dockerized Fiber testnet node:

```sh
pnpm install
cp .env.live-node.example .env.live-node
pnpm fiber:testnet
pnpm dev:live
```

Local live services:

```txt
Fiber RPC: http://127.0.0.1:8227
API:       http://127.0.0.1:8788
Web:       http://localhost:3000
```

Validate a live-node run:

```sh
pnpm smoke:live
```

`pnpm fiber:testnet` is for local testnet development only. It uses a disposable key flow and should not be used for funded production nodes.

## Deploy

The hosted deployment uses:

```txt
Railway Fiber node + worker -> Supabase Postgres -> Vercel API -> Vercel Web
```

The worker must run outside Vercel because it is a long-running polling process. Vercel serves request/response workloads only: the Fastify API and the Next.js frontend.

Deployment guide: [docs/deployment.md](docs/deployment.md)

## API Surface

Core endpoints:

```txt
GET  /health
GET  /api/network/summary
GET  /api/network/history
GET  /api/ingestion/sources
GET  /api/nodes
GET  /api/nodes/:pubkey
GET  /api/channels
GET  /api/channels/:outpoint
GET  /api/search
GET  /api/routes/estimate
GET  /api/liquidity/recommendations
GET  /api/readiness/can-pay
GET  /api/readiness/can-receive
GET  /api/diagnostics/explain
POST /api/diagnostics/explain
GET  /api/reachability/summary
GET  /api/export/graph.json
GET  /api/export/nodes.csv
GET  /api/export/channels.csv
GET  /api/openapi.json
```

Example route readiness query:

```sh
curl -fsS 'https://fiber-scope-api-six.vercel.app/api/routes/estimate?source_pubkey=0262dafc075994862492d66752591dc790210e32a298bd934339298fcf10d00f61&target_pubkey=034c662ff2cb6c290c50d31df4e8640dba489f73dfdeb43dd1faede96021505381&asset=CKB&amount=100000000'
```

Example diagnostics request:

```sh
curl -fsS 'https://fiber-scope-api-six.vercel.app/api/diagnostics/explain' \
  -H 'content-type: application/json' \
  -d '{"message":"payment failed because no route found for asset CKB and insufficient liquidity","asset":"CKB","amount":"100000000"}'
```

## Current Status

Working:

- Fiber RPC graph ingestion from live testnet nodes.
- Normalized public graph storage in Postgres.
- Explorer pages for network, nodes, channels, routes, liquidity, diagnostics, observability, search, and docs.
- Route estimation and readiness checks based on public graph constraints.
- Liquidity recommendation scoring.
- Failure diagnostics responses.
- OpenAPI, JSON export, and CSV export.
- Railway continuous ingestion and Vercel-hosted API/web deployment.

Optional or environment-dependent:

- CKB funding enrichment depends on RPC/indexer availability and channel outpoint decoding.
- Reachability probes are disabled by default and depend on public TCP accessibility.

Not in scope:

- Opening channels.
- Sending payments.
- Custody or key management.
- Private payment tracing.

## Verification

```sh
pnpm typecheck
pnpm test
NEXT_PUBLIC_API_URL=https://fiber-scope-api-six.vercel.app \
FIBERSCOPE_SERVER_API_URL=https://fiber-scope-api-six.vercel.app \
pnpm --filter @fiberscope/web build
```

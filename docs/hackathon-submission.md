# Hackathon Submission Draft

## Project Summary

FiberScope is an open-source Fiber Network explorer, route-readiness engine, diagnostics API, and OpenAPI-documented integration layer. It turns Fiber public graph data into reusable infrastructure for developers: normalized node and channel views, liquidity recommendations, payment readiness checks, route estimates, failure diagnostics, OpenAPI metadata, and graph exports.

## Selected Category

Node, Routing, Cross-Chain, and Diagnostics Infrastructure.

FiberScope also supports Wallet and Payment UX Infrastructure through its readiness APIs, but the core submission is infrastructure for graph ingestion, routing diagnostics, network visibility, and operator tooling.

## Team Members

- TBD

## Repository

- TBD: public repository URL

## Demo

- Local web UI: `http://localhost:3000`
- Local API: `http://127.0.0.1:8788` in live-node mode
- Hosted demo: TBD
- Video demonstration: TBD

## Problem

Fiber developers need infrastructure before they can build reliable wallet, merchant, and liquidity products. Raw Fiber RPC graph data is useful, but it does not directly answer product questions:

- Can this payment probably route?
- Does this receiver have public inbound capacity?
- Which public peer should a wallet open a channel with?
- Which asset has usable public capacity?
- Is the explorer fresh or serving stale graph data?
- Why did a payment fail, and what should a wallet or operator try next?

Without reusable tooling, each wallet, merchant, explorer, or liquidity service must independently implement graph ingestion, normalization, scoring, route simulation, diagnostics, exports, and documentation.

## Solution

FiberScope provides a reusable layer between Fiber nodes and applications:

```txt
Fiber node RPC -> worker ingestion -> Postgres -> Fastify API -> web UI / OpenAPI clients
```

It can run in three modes:

- Demo mode: built-in sample graph for onboarding and UI demos.
- Live-node mode: one real Fiber RPC endpoint.
- Hosted multi-node mode: multiple Fiber RPC sources for higher availability.

End users do not need to run a Fiber node. Operators connect FiberScope to one or more nodes, and wallets, merchants, services, or dashboards consume the normalized APIs.

## Working Features

- Fiber RPC graph ingestion through `graph_nodes` and `graph_channels`.
- Source-level ingestion snapshots with status, timestamps, node counts, channel counts, and errors.
- Public node explorer with scores and announced metadata.
- Public channel explorer with capacity, asset, endpoint nodes, and directional policy.
- Network summary with capacity by asset, enabled/disabled direction counts, stale counts, and reachability status.
- Route estimate API for public graph payment readiness.
- Wallet-friendly `can-pay` and `can-receive` APIs.
- Liquidity recommendation API for choosing public peers.
- Failure diagnostics API that maps low-level messages to actionable recovery steps.
- Optional TCP reachability probes for announced multiaddrs.
- Optional CKB funding outpoint enrichment.
- JSON and CSV exports for external monitoring and analysis.
- OpenAPI endpoint for integration.
- OpenAPI contract for generated clients and integration tests.
- Reproducible demo/live-node scripts.

## Technical Breakdown

### Apps

- `apps/worker`: polls Fiber RPC, upserts normalized graph snapshots, enriches CKB outpoints, runs optional reachability probes, and refreshes node scores.
- `apps/api`: exposes explorer, readiness, liquidity, diagnostics, observability, export, and OpenAPI endpoints.
- `apps/web`: Next.js reference explorer UI.

### Packages

- `@fiberscope/fiber-rpc`: Fiber JSON-RPC client.
- `@fiberscope/route-engine`: route estimation and confidence scoring.
- `@fiberscope/ckb-indexer`: CKB RPC/indexer enrichment helpers.
- `GET /api/openapi.json`: contract for generated clients, wallet integrations, merchant services, and monitoring tools.
- `@fiberscope/shared`: shared graph types, asset helpers, and sample graph.
- `@fiberscope/db`: Prisma database client package.

### Data Model

FiberScope stores public and derived infrastructure data:

- ingestion sources
- graph snapshots
- public nodes
- public channels
- directional channel updates
- assets
- optional CKB funding evidence
- optional reachability probes
- node scores

It does not store private payments, private invoices, exact private channel balances, or private paths.

## Real Fiber Validation

Live-node validation used a real Fiber testnet node from the Docker image:

```txt
nervos/fiber:0.9.0-rc7
Fiber RPC: http://127.0.0.1:8227
sample source: disabled
```

Latest observed live graph after running the worker:

```txt
nodes: 51
current channels: 1033
known channels including stale: 1034
enabled directions: 1969
latest source: http://127.0.0.1:8227
```

Counts are expected to change as the Fiber testnet graph changes.

Live route-readiness smoke test:

```sh
pnpm smoke:live
```

## What Is Real vs Simulated

Real:

- Fiber RPC ingestion from a live Fiber node.
- Public graph normalization.
- Route readiness based on public graph data.
- Liquidity recommendation scoring.
- Ingestion observability.
- API, OpenAPI contract, exports, and web UI.

Optional or environment-dependent:

- CKB funding enrichment depends on RPC/indexer availability and outpoint decoding.
- Reachability probes are opt-in and depend on public TCP accessibility.

Not implemented as production payment control:

- Opening channels from FiberScope.
- Sending payments from FiberScope.
- Custody or key management.
- Private payment tracing.

This boundary is intentional. FiberScope is infrastructure for visibility, readiness, and diagnostics, not a custodial wallet.

## Reusability

Developers can reuse FiberScope in several ways:

- Run it beside a Fiber node as an operator dashboard.
- Use the API as a wallet readiness backend.
- Use the HTTP API or generated OpenAPI clients inside wallet or merchant services.
- Export graph data to notebooks, monitoring systems, or liquidity services.
- Use diagnostics responses to translate low-level failures into user-facing recovery flows.
- Use liquidity recommendations to guide channel opening and LSP-style peer selection.

## Run Instructions

Demo mode:

```sh
pnpm install
pnpm dev:demo
```

Live-node mode:

```sh
pnpm install
cp .env.live-node.example .env.live-node
pnpm fiber:testnet
pnpm dev:live
pnpm smoke:live
```

Open:

```txt
http://localhost:3000
```

## Roadmap

Near term:

- Hosted public FiberScope instance.
- Historical graph timeline and diff views.
- More detailed route failure classification.
- Multi-source graph reconciliation.
- Richer CKB funding proof and channel lifecycle views.

Medium term:

- Wallet embeddable readiness modal.
- Merchant payment status dashboard primitives.
- LSP/liquidity provider discovery metadata.
- Alerting for weak routes, stale graph sources, and unreachable nodes.
- Stablecoin and multi-asset readiness profiles.

Long term:

- Cross-chain diagnostics for Fiber/CCH/Lightning experiments.
- Route simulation test harness for Fiber developers.
- Production deployment templates with metrics, backups, and auth.

## AI Allowance Claim

AI tools were used for research, planning, implementation assistance, documentation drafting, and validation workflow design. Claim amount: TBD.

## Judging Fit

FiberScope fits the hackathon mission because it makes Fiber easier to use, integrate, operate, and productise. It is not a consumer app built on top of Fiber; it is infrastructure that other wallets, merchants, developers, node operators, and liquidity services can reuse.

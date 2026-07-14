# Video Script

Target length: 4 to 6 minutes.

## 0:00 - 0:30 Problem

Fiber enables fast off-chain payments, but developers still need infrastructure around it. Wallets and merchants need to know whether a payment can probably route, whether a receiver has inbound capacity, which peers are useful for channel opening, and whether failures are caused by routing, liquidity, asset mismatch, or connectivity.

Raw Fiber RPC data is not enough by itself. Every team should not have to rebuild graph ingestion, normalization, diagnostics, and route-readiness APIs.

## 0:30 - 1:00 Product

FiberScope is a reusable Fiber infrastructure layer. It connects to one or more Fiber nodes, ingests public graph data, stores normalized snapshots, and exposes:

- a web explorer
- route-readiness APIs
- liquidity recommendations
- diagnostics
- OpenAPI metadata
- graph exports
- a typed SDK

The browser user does not need a Fiber node. The backend operator connects FiberScope to Fiber RPC.

## 1:00 - 1:45 Live Graph

Show the home page.

Point out current live metrics:

- public nodes
- public channels
- enabled directions
- capacity by asset
- stale channel count
- latest snapshot timestamp

Say clearly whether this run is live-node mode or demo mode. For judging, show live-node mode and run:

```sh
pnpm smoke:live
```

## 1:45 - 2:30 Observability

Open Observability.

Explain:

- each Fiber RPC source has snapshot status
- failures are captured per source
- cached graph data remains available when a node temporarily fails
- this is needed for hosted explorers and operator dashboards

## 2:30 - 3:15 Nodes And Channels

Open a node page and a channel page.

Explain:

- node pubkey, name, features, and announced addresses
- channel capacity and asset
- directional policies
- fee rates
- advertised outbound liquidity when available
- optional reachability and CKB funding evidence

## 3:15 - 4:00 Route And Wallet Readiness

Open Route Readiness.

Use:

```txt
source: 0262dafc075994862492d66752591dc790210e32a298bd934339298fcf10d00f61
target: 034c662ff2cb6c290c50d31df4e8640dba489f73dfdeb43dd1faede96021505381
asset: CKB
amount: 100000000
```

Explain:

- `canPay` is not a payment guarantee
- confidence is based on public graph constraints
- missing advertised outbound liquidity lowers confidence
- wallets can use this before attempting a payment

Then open receive readiness and show inbound capacity for the target.

## 4:00 - 4:45 Diagnostics And SDK

Open Diagnostics and paste:

```txt
no route found for asset CKB
```

Explain that FiberScope translates low-level failures into actionable categories and recovery steps.

Open Docs and show:

- `/api/readiness/can-pay`
- `/api/readiness/can-receive`
- `/api/liquidity/recommendations`
- `/api/diagnostics/explain`
- `/api/export/graph.json`
- `@fiberscope/sdk`

## 4:45 - 5:30 Infrastructure Fit

Close with:

FiberScope is not a wallet and not a payment explorer. It does not reveal private payments or private balances. It is infrastructure that other builders can reuse to make Fiber easier to integrate, operate, and productise.

Future work includes hosted deployment, multi-source reconciliation, richer route diagnostics, alerting, stablecoin-specific liquidity views, and CCH/Lightning comparison tooling.

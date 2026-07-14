# Demo Script

This script works for both demo mode and live-node mode. For judging, prefer live-node mode so the counts and routes come from Fiber RPC instead of sample data.

## Setup

Live-node demo:

```sh
pnpm install
cp .env.live-node.example .env.live-node
pnpm fiber:testnet
pnpm dev:live
```

Clean live smoke test:

```sh
pnpm smoke:live
```

Sample-data fallback:

```sh
pnpm dev:demo
```

Open:

```txt
http://localhost:3000
```

## Talk Track

1. Start with the problem.

   Fiber has public graph data, route constraints, liquidity direction, peer state, and node health signals, but wallet and merchant developers should not have to build graph ingestion, normalization, route diagnostics, and observability from scratch.

2. State the product.

   FiberScope is a reusable Fiber observability and route-readiness layer. It connects to one or more Fiber nodes, stores normalized public graph snapshots, and exposes a web explorer plus typed APIs for wallets, merchants, node operators, and liquidity services.

3. Show the network overview.

   Point out:

   - public nodes
   - public channels
   - enabled directions
   - capacity by asset
   - stale node/channel indicators
   - last real ingestion timestamp

4. Open Observability.

   Explain that the product is not scraping UI state. It shows the ingestion source, latest snapshot status, node/channel counts, errors, and timestamps. This is how an operator can tell whether the explorer is fresh or serving cached data.

5. Open Nodes.

   Explain:

   - node pubkey and display name
   - announced addresses
   - routing score
   - liquidity score
   - optional reachability score
   - public channel relationships

6. Open Channels.

   Explain:

   - channel outpoint
   - two endpoint nodes
   - shared capacity
   - asset
   - directional status
   - fee policy
   - advertised outbound liquidity when available
   - CKB funding evidence when enrichment is available

7. Run route readiness.

   Use two high-liquidity nodes from the current live graph. These were valid during the latest live validation:

   ```txt
   source: 0262dafc075994862492d66752591dc790210e32a298bd934339298fcf10d00f61
   target: 034c662ff2cb6c290c50d31df4e8640dba489f73dfdeb43dd1faede96021505381
   asset: CKB
   amount: 100000000
   ```

   The expected shape is:

   ```txt
   canPay: true
   confidence: around 0.88
   hopCount: 1
   estimatedFee: 100000
   warning: outbound liquidity may not be advertised
   ```

   Explain that the warning is important: FiberScope distinguishes "route looks possible" from "public graph can prove liquidity." This is valuable infrastructure for wallet UX.

8. Run receive readiness.

   Use the same target pubkey:

   ```txt
   target: 034c662ff2cb6c290c50d31df4e8640dba489f73dfdeb43dd1faede96021505381
   asset: CKB
   amount: 100000000
   ```

   Explain inbound capacity in wallet terms: receiving is not just having a wallet address; the receiver needs usable inbound channel direction for the asset and amount.

9. Open Liquidity.

   Show that FiberScope can recommend public peers for opening channels by asset and amount. This supports wallet onboarding, LSP tooling, and liquidity dashboards.

10. Open Diagnostics.

    Paste:

    ```txt
    no route found for asset CKB
    ```

    Explain that low-level routing failures become wallet/operator actions: check asset support, channel state, amount, receiver readiness, and peer connectivity.

11. Open Docs.

    Highlight:

    - `/api/readiness/can-pay`
    - `/api/readiness/can-receive`
    - `/api/liquidity/recommendations`
    - `/api/diagnostics/explain`
    - `/api/openapi.json`
    - `/api/export/graph.json`
    - `/api/export/nodes.csv`
    - `/api/export/channels.csv`
    - `@fiberscope/sdk`

12. State the privacy boundary.

    FiberScope is not a payment explorer. It does not reveal private payments, private invoices, exact private balances, or private payment paths. It only makes public graph and operator-visible diagnostics reusable.

## One-Minute Close

FiberScope addresses a clear Fiber infrastructure gap: developers need reliable graph ingestion, route-readiness checks, liquidity visibility, diagnostics, and exports before wallets, merchants, and LSP-style services can build good payment experiences. The project is reusable because the API and SDK are the primary product; the web explorer is the reference client.

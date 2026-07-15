# FiberScope Demo Guide

Use the hosted demo for recording:

```txt
https://fiber-scope-web.vercel.app
```

Keep the API health check ready:

```sh
curl -fsS https://fiber-scope-api-six.vercel.app/health
```

## Test Values

Route readiness:

```txt
source: 0262dafc075994862492d66752591dc790210e32a298bd934339298fcf10d00f61
target: 034c662ff2cb6c290c50d31df4e8640dba489f73dfdeb43dd1faede96021505381
asset: CKB
amount: 100000000
```

Search:

```txt
0x7a47009d25089ebb22aea2c82876c8362e18d44325e579c4fc5f1e57758fbbdc00000000
```

Diagnostics:

```txt
payment failed because no route found for asset CKB and insufficient liquidity
```

## Recording Flow

1. Open the homepage.

   Say that FiberScope is infrastructure for Fiber Network: it indexes the public Fiber graph and turns it into explorer views, route readiness, liquidity recommendations, diagnostics, search, exports, and an API.

2. Show the live architecture.

   Explain:

   ```txt
   Railway Fiber node + worker -> Supabase Postgres -> Vercel API/Web
   ```

   The user does not need to run a Fiber node. The infrastructure layer handles graph ingestion.

3. Show the network overview and map.

   Point out public nodes, public channels, enabled directions, capacity by asset, stale indicators, and latest ingestion time.

4. Open Search.

   Paste the channel outpoint from the test values. Explain that a developer can paste an unknown Fiber value and FiberScope classifies it across nodes, channels, assets, and route history.

5. Open the channel result.

   Show capacity, asset, endpoint nodes, directional state, fee policy, outbound liquidity signals, and CKB evidence when present.

6. Open Routes.

   Paste the route-readiness values and run the estimate. Explain that this is not sending a payment; it is a public-graph readiness check that wallets or merchants can call before attempting a payment.

7. Open Liquidity.

   Show peer recommendations by asset and amount. Explain that this helps wallets, operators, and LSP-style services choose useful channel peers.

8. Open Diagnostics.

   Paste the diagnostics message. Explain that low-level payment failures are translated into categories and concrete recovery actions.

9. Open Docs.

   Show that developers can copy API calls and use:

   ```txt
   /api/readiness/can-pay
   /api/readiness/can-receive
   /api/liquidity/recommendations
   /api/diagnostics/explain
   /api/search
   /api/export/graph.json
   /api/openapi.json
   ```

10. Close with the privacy boundary.

    FiberScope does not expose private payments, private invoices, exact private balances, or private paths. It only indexes public graph data and optional public CKB evidence.

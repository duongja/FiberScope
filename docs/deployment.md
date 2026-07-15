# FiberScope Deployment

This guide covers the deployment shape used for the hosted demo and the minimum commands needed to run FiberScope locally.

## Hosted Demo

```txt
Web: https://fiber-scope-web.vercel.app
API: https://fiber-scope-api-six.vercel.app
OpenAPI: https://fiber-scope-api-six.vercel.app/api/openapi.json
```

Production-style topology:

```txt
Railway Fiber node + worker -> Supabase Postgres -> Vercel API -> Vercel Web
```

The Fiber node and worker run together on Railway. Fiber RPC stays private on `127.0.0.1:8227` inside that service. The worker continuously indexes public graph data into Supabase. Vercel serves the API and frontend from the indexed database.

## Required Environment

API:

```txt
DATABASE_URL=postgresql://...
NODE_ENV=production
LOG_LEVEL=warn
```

Web:

```txt
NEXT_PUBLIC_API_URL=https://fiber-scope-api-six.vercel.app
FIBERSCOPE_SERVER_API_URL=https://fiber-scope-api-six.vercel.app
```

Worker/Fiber service:

```txt
DATABASE_URL=postgresql://...
FIBERSCOPE_USE_SAMPLE_DATA=false
FIBER_GRAPH_POLL_INTERVAL_SECONDS=300
FIBER_SECRET_KEY_PASSWORD=replace-with-a-long-secret
CKB_RPC_URL=https://testnet.ckb.dev/rpc
CKB_EXPLORER_BASE_URL=https://pudge.explorer.nervos.org
FIBERSCOPE_ENABLE_REACHABILITY_PROBES=false
```

## Railway Worker

Create a Railway service from the repository using:

```txt
Dockerfile path: infra/railway/fiberscope-live.Dockerfile
Volume mount path: /fiber
```

The container starts Fiber RPC locally, pushes the Prisma schema, then runs the worker continuously. The `/fiber` volume keeps the Fiber key, config, and database across redeploys.

Do not expose a public Railway domain for this service. It is not the public API.

## Vercel API

Create a Vercel project:

```txt
Root Directory: apps/api
Framework Preset: Other
Build Command: cd ../.. && pnpm --filter @fiberscope/api... build
Install Command: cd ../.. && pnpm install --frozen-lockfile && pnpm db:generate
```

Verify:

```sh
curl https://fiber-scope-api-six.vercel.app/health
curl https://fiber-scope-api-six.vercel.app/api/network/summary
curl https://fiber-scope-api-six.vercel.app/api/ingestion/sources
```

## Vercel Web

Create a second Vercel project:

```txt
Root Directory: apps/web
Framework Preset: Next.js
Build Command: cd ../.. && pnpm --filter @fiberscope/web... build
Install Command: cd ../.. && pnpm install --frozen-lockfile && pnpm db:generate
```

Open:

```txt
https://fiber-scope-web.vercel.app
```

## Local Demo

No Fiber node required:

```sh
pnpm install
pnpm dev:demo
```

Open:

```txt
http://localhost:3000
```

## Local Live Fiber Testnet

Run against a Dockerized Fiber testnet node:

```sh
pnpm install
cp .env.live-node.example .env.live-node
pnpm fiber:testnet
pnpm dev:live
pnpm smoke:live
```

Local services:

```txt
Fiber RPC: http://127.0.0.1:8227
API:       http://127.0.0.1:8788
Web:       http://localhost:3000
```

The local Fiber helper uses a throwaway testnet key. Do not use it for funded production nodes.

## Operator Notes

- Keep Fiber RPC private unless you add authentication and network controls.
- Run one worker replica per Fiber source unless you intentionally design multi-source reconciliation.
- The API can serve the latest stored graph if the Fiber node is temporarily unavailable.
- Freshness is visible at `/api/ingestion/sources`.
- Reachability probes are optional operational signals, not payment guarantees.

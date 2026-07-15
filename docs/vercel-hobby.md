# Vercel Hobby Deployment

This runbook deploys FiberScope on Vercel Hobby with:

- Vercel project 1: Fastify API as serverless functions.
- Vercel project 2: Next.js web UI.
- External Postgres: shared database for API reads and worker ingestion.
- External worker: Railway, VPS, or another long-running host connected to Fiber RPC.

The worker is not deployed to Vercel. It is a polling process, so run it as a long-running Railway/VPS service for production-like demos. Manual `pnpm ingest:once` runs are useful for local checks, but the hosted demo should use continuous ingestion.

## 1. Create The Production Database

Create a Postgres database with a pooled connection string if your provider offers one. Neon, Supabase, Vercel Postgres, or a small VPS Postgres instance are all fine for judging traffic.

Set the schema once from your local machine or deployment shell:

```sh
pnpm install
pnpm db:generate
DATABASE_URL="postgresql://..." pnpm db:push
```

Use the same `DATABASE_URL` for the API deployment and every ingestion run.

## 2. Deploy The API Project

Create a Vercel project from the GitHub repository and set:

```txt
Root Directory: apps/api
Framework Preset: Other
Build Command: cd ../.. && pnpm --filter @fiberscope/api... build
Install Command: cd ../.. && pnpm install --frozen-lockfile && pnpm db:generate
```

The repository includes `apps/api/vercel.json`, so Vercel should pick up the function and rewrite settings automatically. The API uses one Vercel Serverless Function and rewrites all API paths into that function to stay within the Hobby plan limit. The trailing `...` in the build filter is required because this is a monorepo: it builds the API package and its workspace dependencies on a cold Vercel machine.

Set these environment variables in the API project:

```txt
DATABASE_URL=postgresql://...
NODE_ENV=production
LOG_LEVEL=warn
```

After deploy, verify:

```sh
curl https://YOUR_API_PROJECT.vercel.app/health
curl https://YOUR_API_PROJECT.vercel.app/api/network/summary
```

## 3. Refresh Data Manually

Run one-shot ingestion against the production database only when you need a manual refresh or validation run. This fetches the graph from a reachable Fiber RPC endpoint, writes it into Postgres, refreshes scores, and exits.

```sh
DATABASE_URL="postgresql://..." \
FIBER_RPC_URLS="http://your-reachable-fiber-rpc:8227" \
FIBERSCOPE_USE_SAMPLE_DATA="false" \
pnpm ingest:once
```

If no graph source is reachable, the command exits non-zero so the production database is not mistaken for freshly refreshed data.

Optional CKB enrichment:

```sh
DATABASE_URL="postgresql://..." \
FIBER_RPC_URLS="http://your-reachable-fiber-rpc:8227" \
FIBERSCOPE_USE_SAMPLE_DATA="false" \
CKB_RPC_URL="https://testnet.ckb.dev/rpc" \
CKB_EXPLORER_BASE_URL="https://pudge.explorer.nervos.org" \
pnpm ingest:once
```

For automatic updates, run the worker continuously on Railway instead of relying on this manual command. See [Railway continuous ingestion](railway-continuous-ingestion.md).

## 3.1. Optional GitHub Actions Fallback

The repository includes `.github/workflows/fiberscope-ingest.yml`. It refreshes the Supabase graph every two hours and can also be run manually from the GitHub Actions tab. Use this only when the Fiber RPC URL is publicly reachable from GitHub Actions. The preferred automatic setup is the Railway worker in [Railway continuous ingestion](railway-continuous-ingestion.md), where Fiber RPC can stay private on localhost.

Add these repository secrets in GitHub:

```txt
FIBERSCOPE_DATABASE_URL=postgresql://...
FIBERSCOPE_FIBER_RPC_URLS=http://your-reachable-fiber-rpc:8227
```

Optional repository variables:

```txt
FIBERSCOPE_API_URL=https://fiber-scope-api-six.vercel.app
FIBERSCOPE_CKB_RPC_URL=https://testnet.ckb.dev/rpc
FIBERSCOPE_CKB_EXPLORER_BASE_URL=https://pudge.explorer.nervos.org
```

Manual run:

```txt
GitHub repository -> Actions -> Refresh FiberScope graph -> Run workflow
```

The workflow fails if the Fiber RPC URL is down, so a failed run is a useful signal that the external node or public RPC endpoint needs attention.

## 4. Deploy The Web Project

Create a second Vercel project from the same GitHub repository and set:

```txt
Root Directory: apps/web
Framework Preset: Next.js
Build Command: cd ../.. && pnpm --filter @fiberscope/web... build
Install Command: cd ../.. && pnpm install --frozen-lockfile && pnpm db:generate
```

Set these environment variables in the web project:

```txt
NEXT_PUBLIC_API_URL=https://YOUR_API_PROJECT.vercel.app
FIBERSCOPE_SERVER_API_URL=https://YOUR_API_PROJECT.vercel.app
```

After deploy, open:

```txt
https://YOUR_WEB_PROJECT.vercel.app
```

## 5. Judging Operations

Keep the Fiber node and worker online separately from Vercel. In the current hosted architecture, Railway runs both in one service and writes to Supabase continuously:

```txt
Railway Fiber node + worker -> Supabase Postgres -> Vercel API/Web
```

Verify that the hosted API sees fresh data:

```sh
curl https://fiber-scope-api-six.vercel.app/health
curl https://fiber-scope-api-six.vercel.app/api/ingestion/sources
curl https://fiber-scope-api-six.vercel.app/api/network/summary
```

For a new deployment, replace the URLs with your own Vercel project domains:

```sh
curl https://YOUR_API_PROJECT.vercel.app/health
curl https://YOUR_API_PROJECT.vercel.app/api/ingestion/sources
curl https://YOUR_API_PROJECT.vercel.app/api/network/summary
```

## 6. Production Notes

- Vercel serves the web UI and API only.
- A long-running worker should move to a VPS, Fly.io, Render worker, Railway service, or GitHub Actions schedule after judging.
- Do not put Fiber private keys or CKB wallet secrets into Vercel.
- Keep Fiber RPC protected if you expose an operator-managed or funded production node.
- Use provider backups or scheduled `pg_dump` for the production Postgres database.

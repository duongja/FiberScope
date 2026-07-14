# Vercel Hobby Deployment

This runbook deploys FiberScope on Vercel Hobby with:

- Vercel project 1: Fastify API as serverless functions.
- Vercel project 2: Next.js web UI.
- External Postgres: shared database for API reads and one-shot worker ingestion.
- External Fiber node: the Codespaces or VPS-hosted Fiber RPC endpoint.

The worker is not deployed to Vercel. It is a polling process, so run it manually, from Codespaces, from GitHub Actions, or later on a VPS.

## 1. Create The Production Database

Create a Postgres database with a pooled connection string if your provider offers one. Neon, Supabase, Vercel Postgres, or a small VPS Postgres instance are all fine for judging traffic.

Set the schema once from your local machine or Codespaces:

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

The repository includes `apps/api/vercel.json`, so Vercel should pick up the function and rewrite settings automatically. The trailing `...` in the build filter is required because this is a monorepo: it builds the API package and its workspace dependencies on a cold Vercel machine.

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

## 3. Ingest The Hosted Fiber Node

Run one-shot ingestion against the production database. This fetches the graph from the hosted Fiber node, writes it into Postgres, refreshes scores, and exits.

```sh
DATABASE_URL="postgresql://..." \
FIBER_RPC_URLS="https://curly-trout-q6xj79w9vx7f6jp-8227.app.github.dev/" \
FIBERSCOPE_USE_SAMPLE_DATA="false" \
pnpm ingest:once
```

If no graph source is reachable, the command exits non-zero so the production database is not mistaken for freshly refreshed data.

Optional CKB enrichment:

```sh
DATABASE_URL="postgresql://..." \
FIBER_RPC_URLS="https://curly-trout-q6xj79w9vx7f6jp-8227.app.github.dev/" \
FIBERSCOPE_USE_SAMPLE_DATA="false" \
CKB_RPC_URL="https://testnet.ckb.dev/rpc" \
CKB_EXPLORER_BASE_URL="https://pudge.explorer.nervos.org" \
pnpm ingest:once
```

Re-run this command whenever you want to refresh the public graph during judging.

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

Keep the Fiber node online separately from Vercel. For the temporary Codespaces node, keep the forwarded `8227` port public and periodically verify:

```sh
curl -H "content-type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"node_info","params":[]}' \
  https://curly-trout-q6xj79w9vx7f6jp-8227.app.github.dev/
```

Refresh the database before sharing the demo and once or twice per day during judging:

```sh
DATABASE_URL="postgresql://..." \
FIBER_RPC_URLS="https://curly-trout-q6xj79w9vx7f6jp-8227.app.github.dev/" \
FIBERSCOPE_USE_SAMPLE_DATA="false" \
pnpm ingest:once
```

Health checks:

```sh
curl https://YOUR_API_PROJECT.vercel.app/health
curl https://YOUR_API_PROJECT.vercel.app/api/ingestion/sources
curl https://YOUR_API_PROJECT.vercel.app/api/network/summary
```

## 6. Production Notes

- Vercel serves the web UI and API only.
- A long-running worker should move to a VPS, Fly.io, Render worker, Railway service, or GitHub Actions schedule after judging.
- Do not put Fiber private keys or CKB wallet secrets into Vercel.
- Keep Fiber RPC protected if you move from the temporary Codespaces endpoint to a funded production node.
- Use provider backups or scheduled `pg_dump` for the production Postgres database.

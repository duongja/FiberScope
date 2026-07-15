# Railway Continuous Ingestion

This runbook moves FiberScope from manual ingestion to an always-on ingestion workflow:

```txt
Railway live service -> Supabase Postgres -> Vercel API/Web
```

The Railway live service runs both the Fiber node and the FiberScope worker in one container. Fiber RPC stays bound to `127.0.0.1`, so it is not publicly exposed. The worker polls local Fiber RPC continuously, writes normalized graph snapshots to Supabase, enriches CKB outpoint evidence, and refreshes route scores. Vercel does not run the worker; it only serves API and web requests from the database.

## 1. Create The Railway Live Service

Create a Railway service from this repository.

Use:

```txt
Dockerfile path: infra/railway/fiberscope-live.Dockerfile
```

Attach a persistent volume:

```txt
Mount path: /fiber
```

Set environment variables:

```txt
FIBER_SECRET_KEY_PASSWORD=replace-with-a-long-secret
DATABASE_URL=postgresql://...
RUST_LOG=info
FIBERSCOPE_USE_SAMPLE_DATA=false
FIBER_GRAPH_POLL_INTERVAL_SECONDS=300
CKB_RPC_URL=https://testnet.ckb.dev/rpc
CKB_EXPLORER_BASE_URL=https://pudge.explorer.nervos.org
CKB_ENRICH_INTERVAL_SECONDS=180
FIBERSCOPE_ENABLE_REACHABILITY_PROBES=false
```

Do not expose any public Railway domain for this service. It does not serve the public web/API; it runs the node and worker.

The container does this on first boot:

- copies `infra/railway/fiber-config.yml` to `/fiber/config.yml`
- generates `/fiber/ckb/key`
- starts Fiber RPC on `127.0.0.1:8227`
- pushes the Prisma schema to Supabase
- starts the continuous FiberScope worker

Because `/fiber` is a volume, the node key, config, and Fiber database persist across redeploys.

## 2. Keep Vercel As API And Web

Keep the existing Vercel projects:

```txt
API: https://fiber-scope-api-six.vercel.app
Web: https://fiber-scope-web.vercel.app
```

The API project must use the same `DATABASE_URL` as the Railway worker.

The web project should keep:

```txt
NEXT_PUBLIC_API_URL=https://fiber-scope-api-six.vercel.app
FIBERSCOPE_SERVER_API_URL=https://fiber-scope-api-six.vercel.app
```

No manual ingestion command is needed after the Railway worker is running.

## 3. Verify The Workflow

Check the Railway logs. A healthy boot and cycle looks like:

```txt
Waiting for Fiber RPC at http://127.0.0.1:8227
fetching Fiber graph
Fiber graph ingested
CKB channel outpoints enriched
worker task completed
```

Check the hosted API:

```sh
curl https://fiber-scope-api-six.vercel.app/health
curl https://fiber-scope-api-six.vercel.app/api/ingestion/sources
```

Expected:

- `nodeCount` and `channelCount` reflect the latest database state
- latest source snapshot is `COMPLETED`
- `lastError` is `null`
- `lastPollAt` advances automatically without running `pnpm ingest:once`

## 4. Operational Notes

- Use one Railway replica. Multiple replicas pointed at the same source can create overlapping snapshots.
- Keep `FIBERSCOPE_USE_SAMPLE_DATA=false` in production-like deployments.
- Keep Fiber RPC private. This setup intentionally keeps RPC on loopback inside the container.
- If a graph ingestion takes 15 minutes and the interval is 5 minutes, the worker will not overlap with itself. It waits for the current run to finish, then waits the interval before starting the next run.
- If the Fiber node restarts, the worker records the source error and retries on the next cycle. The API continues serving the latest completed snapshot.

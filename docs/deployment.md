# Deployment Runbook

This runbook covers local judging, self-hosted operator deployments, and hosted infrastructure deployments.

## Local Demo Deployment

Use this when no Fiber node is available.

```sh
pnpm install
pnpm dev:demo
```

Open:

```txt
http://localhost:3000
```

This uses `.env.demo`, the `demo` Postgres schema, and sample graph data.

## Local Live-Node Deployment

Use this for a real Fiber graph demo.

```sh
pnpm install
cp .env.live-node.example .env.live-node
pnpm fiber:testnet
pnpm dev:live
pnpm smoke:live
```

Services:

```txt
Fiber RPC: http://127.0.0.1:8227
API:       http://127.0.0.1:8788
Web:       http://localhost:3000
```

`pnpm fiber:testnet` starts a Dockerized Fiber testnet node and generates a throwaway CKB key under `/tmp/fiberscope-real-fnn` if one does not exist. This is local testnet infrastructure only.

## Self-Hosted Operator Deployment

Use this when an operator already runs one or more Fiber nodes.

1. Copy the live profile:

   ```sh
   cp .env.live-node.example .env.live-node
   ```

2. Set the Fiber RPC source:

   ```sh
   FIBER_RPC_URLS="http://your-fiber-node:8227"
   FIBERSCOPE_USE_SAMPLE_DATA="false"
   ```

3. Start dependencies and schema:

   ```sh
   docker compose up -d postgres redis
   pnpm db:generate
   pnpm db:push
   ```

4. Start the app:

   ```sh
   pnpm dev:live
   ```

For production, run the API, worker, and web app under a process supervisor or container orchestrator rather than `pnpm dev`.

## Hosted Multi-Node Deployment

Use multiple Fiber RPC sources so FiberScope is not tied to one node.

```sh
FIBER_RPC_URLS="http://node-a:8227,http://node-b:8227,http://node-c:8227"
FIBERSCOPE_USE_SAMPLE_DATA="false"
```

The worker stores source-level snapshots and errors. If one source fails, the API can continue serving cached data and Observability will show the failure.

## Vercel Hobby Deployment

Use Vercel for the web UI and request/response API, backed by an external Postgres database. Keep the Fiber node and polling worker outside Vercel, then refresh production data with:

```sh
DATABASE_URL="postgresql://..." \
FIBER_RPC_URLS="https://your-fiber-rpc.example/" \
FIBERSCOPE_USE_SAMPLE_DATA="false" \
pnpm ingest:once
```

See [Vercel Hobby deployment](vercel-hobby.md) for the full two-project setup.

## Docker Compose Live Mode

When Fiber RPC runs on the host and FiberScope runs in Docker Compose on Linux, use:

```sh
FIBER_RPC_URLS="http://host.docker.internal:8227" docker compose --env-file .env.live-node up
```

The Compose file maps `host.docker.internal` to the host gateway for worker access.

## Security Notes

- Do not expose Fiber JSON-RPC publicly without authentication and network controls.
- Keep Fiber RPC bound to a private interface where possible.
- Do not use the local throwaway key helper for funded production nodes.
- Do not store production CKB keys in this repository.
- Put public API deployments behind TLS and rate limiting.
- Treat reachability probes as operational signals, not payment guarantees.

## Operational Checks

Run:

```sh
pnpm smoke:live
```

Expected result:

- at least one completed non-sample ingestion source
- no `sample://fiber` source in the live schema
- non-zero node and channel counts
- route estimate generated from two recommended public nodes

Useful endpoints:

```txt
GET /health
GET /api/ingestion/sources
GET /api/network/summary
GET /api/reachability/summary
GET /api/openapi.json
```

## Production Gaps To Close

- Build production Docker images instead of using dev commands in Compose.
- Add auth for admin/operator endpoints if they are exposed beyond trusted networks.
- Add metrics export for API latency, worker poll duration, and Fiber RPC failures.
- Add database backups and retention policy.
- Add multi-source graph reconciliation rules.
- Add hosted deployment IaC.

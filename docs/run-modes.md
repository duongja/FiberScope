# FiberScope Run Modes

FiberScope separates data collection from data consumption:

```txt
Fiber node RPC -> worker ingestion -> Postgres -> API -> web UI / SDK
```

The product needs Fiber node connectivity somewhere in the backend to refresh real public graph data. End users browsing the explorer, wallets using the SDK, and merchant tools calling the API do not need to run a node themselves.

## Demo Mode

Demo mode uses built-in sample graph data. It is useful for UI work, hackathon demos, and SDK onboarding when no Fiber node is available.

```sh
pnpm dev:demo
```

This loads `.env.demo`, uses the `demo` Postgres schema, and keeps `FIBERSCOPE_USE_SAMPLE_DATA=true`.

## Live-Node Mode

Live-node mode disables sample data and ingests from `FIBER_RPC_URLS`.

```sh
cp .env.live-node.example .env.live-node
pnpm fiber:testnet
pnpm dev:live
```

The default `.env.live-node.example` expects Fiber RPC at:

```txt
http://127.0.0.1:8227
```

`pnpm fiber:testnet` starts a disposable testnet Fiber node with Docker using `infra/fiber-testnet/config.yml`. It writes data to `/tmp/fiberscope-real-fnn` by default and generates a throwaway CKB key if one is missing.

This helper is only for local testnet development. Production deployments should use managed Fiber node keys, backups, monitoring, and access control.

## Hosted Multi-Node Mode

For a hosted explorer or infrastructure API, run one worker against multiple Fiber RPC endpoints:

```sh
FIBER_RPC_URLS="http://node-a:8227,http://node-b:8227,http://node-c:8227"
FIBERSCOPE_USE_SAMPLE_DATA="false"
```

The worker will ingest each source and store source-level snapshot status. The API can continue serving cached snapshots if one source is temporarily down, and the Observability page shows failed polls.

## Docker Compose Notes

`docker compose up` remains the quickest sample-data demo.

For live-node Compose mode on Linux, a Fiber node running on the host should be referenced as:

```txt
http://host.docker.internal:8227
```

Example:

```sh
cp .env.live-node.example .env.live-node
FIBER_RPC_URLS="http://host.docker.internal:8227" docker compose --env-file .env.live-node up
```

## What Gets Cached

FiberScope stores:

- public nodes and channels
- directional channel updates
- graph snapshots and ingestion status
- optional CKB funding evidence
- optional reachability probe results
- derived node scores and route-readiness outputs

It does not store private payments, private invoices, exact private balances, or private payment paths.

## Real-Node Validation Baseline

The current live-node validation used `nervos/fiber:0.9.0-rc7` on testnet and ingested:

```txt
nodes: 51
current channels: 1033
known channels including stale: 1034
enabled directions: 1969
sample source: disabled
```

Those counts are network-state dependent and should change as the Fiber testnet graph changes.

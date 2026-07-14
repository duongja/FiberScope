# Codespaces Demo Runbook

This runbook is for temporary hackathon judging. It uses GitHub Codespaces as a development host, not as production infrastructure.

## What Runs

- Fiber testnet node in Docker, using a throwaway key.
- Postgres and Redis in Docker.
- FiberScope API, worker, and web app as background `pnpm` processes.
- Web UI on port `3000`.
- API on port `8788` for live-node mode, or `8787` for sample demo mode.
- Fiber RPC on `127.0.0.1:8227`, kept private unless you explicitly expose it.

## Start Live Demo

Open the repo in Codespaces, wait for `postCreateCommand` to finish, then run:

```sh
pnpm codespaces:start
```

This defaults to live-node mode. It starts the disposable Fiber node, ingests public Fiber graph data, and starts the UI.

For sample data only:

```sh
pnpm codespaces:demo
```

## Port Visibility

In the Codespaces **Ports** tab:

- Set port `3000` to public for judges.
- Set the API port public too if judges will use route estimates or diagnostics from the browser:
  - `8788` for live-node mode.
  - `8787` for sample demo mode.
- Keep port `8227` private. It is the Fiber node RPC endpoint.

The start script prints the expected public web and API URLs. Codespaces URLs usually look like:

```txt
https://<codespace-name>-3000.<forwarding-domain>
https://<codespace-name>-8788.<forwarding-domain>
```

## Health Check

Run:

```sh
pnpm codespaces:health
```

Expected output:

```txt
ok   web http://127.0.0.1:3000
ok   api http://127.0.0.1:8788/health
ok   fiber http://127.0.0.1:8227
ok   process api pid=...
ok   process worker pid=...
ok   process web pid=...
```

Logs are written to:

```txt
.codespaces-runtime/logs/
```

Useful log commands:

```sh
tail -f .codespaces-runtime/logs/web.log
tail -f .codespaces-runtime/logs/api.log
tail -f .codespaces-runtime/logs/worker.log
docker logs -f fiberscope-real-fnn
```

## Stop

```sh
pnpm codespaces:stop
```

This stops the app processes, Postgres, Redis, and the disposable Fiber container.

To restart only the app processes while leaving Docker services alone:

```sh
scripts/codespaces-stop-demo.sh --apps-only
pnpm codespaces:start
```

## If Codespaces Sleeps

Codespaces can stop after inactivity. Do not rely on it as a production server.

For a judging week:

1. Increase your Codespaces idle timeout in GitHub settings as much as your plan/org allows.
2. Pin or retain the codespace so it is not deleted during judging.
3. If it sleeps, reopen it and run `pnpm codespaces:start` again.
4. Re-check port visibility, because public/private port settings can need confirmation after restarts.

## Optional Overrides

Create `.env.codespaces.local` for local-only overrides. This file is ignored by git.

Examples:

```sh
FIBERSCOPE_ENABLE_REACHABILITY_PROBES="true"
FIBER_GRAPH_POLL_INTERVAL_SECONDS="180"
FIBERSCOPE_PUBLIC_API_URL="https://your-public-api-url"
FIBERSCOPE_PUBLIC_WEB_URL="https://your-public-web-url"
```

## Limitations

- Codespaces is temporary development infrastructure.
- Uptime is not guaranteed.
- Do not fund the generated Fiber key.
- Do not expose Fiber RPC publicly unless you know exactly why.
- Move the node, API, worker, and database to a VPS before calling this production.

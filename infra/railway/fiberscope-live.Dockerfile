FROM nervos/fiber:0.9.0-rc7 AS fiber

FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl openssl tini \
  && rm -rf /var/lib/apt/lists/* \
  && corepack enable

COPY --from=fiber /usr/local/bin/fnn /usr/local/bin/fnn
COPY --from=fiber /usr/local/bin/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY prisma ./prisma
COPY apps/worker/package.json ./apps/worker/package.json
COPY packages/ckb-indexer/package.json ./packages/ckb-indexer/package.json
COPY packages/db/package.json ./packages/db/package.json
COPY packages/fiber-rpc/package.json ./packages/fiber-rpc/package.json
COPY packages/shared/package.json ./packages/shared/package.json

RUN pnpm install --frozen-lockfile

COPY apps/worker ./apps/worker
COPY packages/ckb-indexer ./packages/ckb-indexer
COPY packages/db ./packages/db
COPY packages/fiber-rpc ./packages/fiber-rpc
COPY packages/shared ./packages/shared
COPY infra/railway ./infra/railway

RUN chmod +x /app/infra/railway/fiberscope-live-entrypoint.sh
RUN pnpm db:generate && pnpm --filter @fiberscope/worker... build

ENV NODE_ENV=production
ENTRYPOINT ["/usr/bin/tini", "--", "/app/infra/railway/fiberscope-live-entrypoint.sh"]

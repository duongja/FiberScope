import { CkbRpcClient } from "@fiberscope/ckb-indexer";
import { prisma } from "@fiberscope/db";
import { FiberRpcClient } from "@fiberscope/fiber-rpc";
import { sampleGraph } from "@fiberscope/shared/sample";
import pino from "pino";
import { enrichKnownChannels } from "./enrich.js";
import { readEnv } from "./env.js";
import { upsertGraphSnapshot } from "./ingest.js";
import { probeAnnouncedNodes } from "./probe.js";
import { refreshNodeScores } from "./score.js";

const log = pino({ name: "fiberscope-worker" });
const env = readEnv();

async function pollGraph(): Promise<void> {
  if (env.useSampleData) {
    log.info("ingesting sample Fiber graph");
    await upsertGraphSnapshot({
      prisma,
      sourceName: "sample-fiber-graph",
      sourceUrl: "sample://fiber",
      graph: sampleGraph,
    });
  }

  for (const url of env.fiberRpcUrls) {
    const client = new FiberRpcClient({ url });
    try {
      log.info({ url }, "fetching Fiber graph");
      const graph = await client.fetchGraph();
      await upsertGraphSnapshot({
        prisma,
        sourceName: new URL(url).host,
        sourceUrl: url,
        graph,
      });
      log.info({ url, nodes: graph.nodes.length, channels: graph.channels.length }, "Fiber graph ingested");
    } catch (error) {
      log.warn({ url, error }, "Fiber graph ingestion failed");
      await prisma.ingestionSource.upsert({
        where: { url },
        update: {
          lastPollAt: new Date(),
          lastError: error instanceof Error ? error.message : String(error),
        },
        create: {
          url,
          name: safeSourceName(url),
          lastPollAt: new Date(),
          lastError: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }

  await refreshNodeScores(prisma);
}

async function enrichCkb(): Promise<void> {
  if (!env.ckbRpcUrl) {
    return;
  }
  const client = new CkbRpcClient({
    rpcUrl: env.ckbRpcUrl,
    explorerBaseUrl: env.ckbExplorerBaseUrl,
  });
  const count = await enrichKnownChannels(prisma, client);
  log.info({ count }, "CKB channel outpoints enriched");
}

async function probeReachability(): Promise<void> {
  if (!env.enableReachabilityProbes) {
    return;
  }
  const result = await probeAnnouncedNodes(prisma, {
    limit: env.reachabilityProbeLimit,
    timeoutMs: env.reachabilityTimeoutMs,
  });
  await refreshNodeScores(prisma);
  log.info(result, "reachability probes completed");
}

async function main(): Promise<void> {
  await pollGraph();
  await enrichCkb();
  await probeReachability();

  setInterval(() => {
    pollGraph().catch((error) => log.error({ error }, "graph poll failed"));
  }, env.graphPollIntervalSeconds * 1000);

  setInterval(() => {
    enrichCkb().catch((error) => log.error({ error }, "CKB enrichment failed"));
  }, env.ckbEnrichIntervalSeconds * 1000);

  setInterval(() => {
    probeReachability().catch((error) => log.error({ error }, "reachability probe failed"));
  }, env.reachabilityProbeIntervalSeconds * 1000);
}

function safeSourceName(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

main().catch(async (error) => {
  log.error({ error }, "worker crashed");
  await prisma.$disconnect();
  process.exit(1);
});

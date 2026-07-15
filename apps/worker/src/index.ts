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

async function pollGraph(): Promise<number> {
  let successfulSources = 0;

  if (env.useSampleData) {
    log.info("ingesting sample Fiber graph");
    await upsertGraphSnapshot({
      prisma,
      sourceName: "sample-fiber-graph",
      sourceUrl: "sample://fiber",
      graph: sampleGraph,
    });
    successfulSources += 1;
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
      successfulSources += 1;
      log.info(
        { url, nodes: graph.nodes.length, channels: graph.channels.length },
        "Fiber graph ingested",
      );
    } catch (error) {
      log.warn(
        { url, error: errorDetails(error) },
        "Fiber graph ingestion failed",
      );
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
  return successfulSources;
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
  const successfulSources = await pollGraph();
  await enrichCkb();
  await probeReachability();

  if (env.runOnce) {
    if (successfulSources === 0) {
      throw new Error("one-shot ingestion did not ingest any graph source");
    }
    log.info("one-shot ingestion completed");
    await prisma.$disconnect();
    return;
  }

  runLoop("graph poll", env.graphPollIntervalSeconds, pollGraph);
  runLoop("CKB enrichment", env.ckbEnrichIntervalSeconds, enrichCkb);
  runLoop("reachability probe", env.reachabilityProbeIntervalSeconds, probeReachability);
}

function safeSourceName(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function errorDetails(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      code: "code" in error ? error.code : undefined,
      data: "data" in error ? error.data : undefined,
    };
  }
  return { message: String(error) };
}

function runLoop(label: string, intervalSeconds: number, task: () => Promise<unknown>): void {
  void (async () => {
    while (true) {
      await sleep(intervalSeconds * 1000);
      const startedAt = Date.now();
      try {
        log.info({ label }, "worker task started");
        await task();
        log.info({ label, durationMs: Date.now() - startedAt }, "worker task completed");
      } catch (error) {
        log.error(
          { label, durationMs: Date.now() - startedAt, error: errorDetails(error) },
          "worker task failed",
        );
      }
    }
  })();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function shutdown(signal: string): Promise<void> {
  log.info({ signal }, "worker shutting down");
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

main().catch(async (error) => {
  log.error({ error: errorDetails(error) }, "worker crashed");
  await prisma.$disconnect();
  process.exit(1);
});

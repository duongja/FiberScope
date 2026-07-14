import { PrismaClient } from "@prisma/client";
import { sampleGraph } from "@fiberscope/shared/sample";
import { upsertGraphSnapshot } from "../apps/worker/src/ingest.js";
import { refreshNodeScores } from "../apps/worker/src/score.js";

const prisma = new PrismaClient();

async function main() {
  await upsertGraphSnapshot({
    prisma,
    sourceName: "sample-fiber-graph",
    sourceUrl: "sample://fiber",
    graph: sampleGraph,
  });
  await seedProbeHistory();
  await refreshNodeScores(prisma);
}

async function seedProbeHistory() {
  await prisma.reachabilityProbe.createMany({
    data: [
      {
        nodePubkey: "02b6d4e3ab86a2ca2fad6fae0ecb2e1e559e0b911939872a90abdda6d20302be71",
        address: "34.92.140.11:8228",
        success: true,
        latencyMs: 42,
      },
      {
        nodePubkey: "0291a6576bd5a94bd74b27080a48340875338fff9f6d6361fe6b8db8d0d1912fcc",
        address: "35.221.188.30:8228",
        success: true,
        latencyMs: 58,
      },
      {
        nodePubkey: "03c0ffee0000000000000000000000000000000000000000000000000000000001",
        address: "wallet-demo.fiber.local:8228",
        success: false,
        latencyMs: 2500,
        error: "demo node is not publicly reachable",
      },
      {
        nodePubkey: "03facade0000000000000000000000000000000000000000000000000000000002",
        address: "merchant-demo.fiber.local:8228",
        success: false,
        latencyMs: 2500,
        error: "demo node is not publicly reachable",
      },
    ],
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

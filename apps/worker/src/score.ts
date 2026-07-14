import type { PrismaClient } from "@prisma/client";
import { toBigIntAmount } from "@fiberscope/shared";

export async function refreshNodeScores(prisma: PrismaClient): Promise<void> {
  const nodes = await prisma.fiberNode.findMany({
    include: {
      probes: {
        orderBy: { checkedAt: "desc" },
        take: 10,
      },
    },
  });
  const channels = await prisma.fiberChannel.findMany({
    include: { directions: true },
  });

  for (const node of nodes) {
    const related = channels.filter(
      (channel) => channel.node1Pubkey === node.pubkey || channel.node2Pubkey === node.pubkey,
    );
    const enabledDirections = channels
      .flatMap((channel) => channel.directions)
      .filter((direction) => direction.fromPubkey === node.pubkey && direction.enabled);
    const capacity = related.reduce((total, channel) => total + toBigIntAmount(channel.capacity), 0n);
    const successfulProbes = node.probes.filter((probe) => probe.success).length;
    const reachabilityScore =
      node.probes.length === 0 ? 0.5 : Math.min(1, successfulProbes / node.probes.length);
    const routingScore = Math.min(1, enabledDirections.length / 8 + related.length / 20);
    const liquidityScore = Number(capacity > 0n ? Math.min(1, Number(capacity / 100_000_000n) / 10_000) : 0);

    await prisma.nodeScore.upsert({
      where: { nodePubkey: node.pubkey },
      update: { routingScore, liquidityScore, reachabilityScore },
      create: {
        nodePubkey: node.pubkey,
        routingScore,
        liquidityScore,
        reachabilityScore,
      },
    });
  }
}

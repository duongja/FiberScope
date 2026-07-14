import type { PrismaClient } from "@prisma/client";
import type { CkbRpcClient } from "@fiberscope/ckb-indexer";

export async function enrichKnownChannels(prisma: PrismaClient, ckb: CkbRpcClient, limit = 100): Promise<number> {
  const channels = await prisma.fiberChannel.findMany({
    where: {
      OR: [
        { ckbStatus: null },
        {
          ckbStatus: {
            lastCheckedAt: {
              lt: new Date(Date.now() - 1000 * 60 * 30),
            },
          },
        },
      ],
    },
    select: { channelOutpoint: true },
    take: limit,
  });

  for (const channel of channels) {
    const enrichment = await ckb.enrichOutpoint(channel.channelOutpoint);
    await prisma.ckbOutpointStatus.upsert({
      where: { channelOutpoint: channel.channelOutpoint },
      update: {
        txHash: enrichment.txHash,
        outputIndex: enrichment.outputIndex,
        status: enrichment.status,
        blockNumber: enrichment.blockNumber,
        blockTimestamp: enrichment.blockTimestamp,
        spentByTxHash: enrichment.spentByTxHash,
        explorerUrl: enrichment.explorerUrl,
        error: enrichment.error,
        lastCheckedAt: new Date(),
      },
      create: {
        channelOutpoint: channel.channelOutpoint,
        txHash: enrichment.txHash,
        outputIndex: enrichment.outputIndex,
        status: enrichment.status,
        blockNumber: enrichment.blockNumber,
        blockTimestamp: enrichment.blockTimestamp,
        spentByTxHash: enrichment.spentByTxHash,
        explorerUrl: enrichment.explorerUrl,
        error: enrichment.error,
      },
    });
  }

  return channels.length;
}

import { Prisma, type PrismaClient } from "@prisma/client";
import type { FiberChannelUpdateInfo, FiberGraph } from "@fiberscope/shared";
import {
  assetIdForScript,
  assetSymbolIndexFromNodes,
  assetSymbolForScript,
  CKB_ASSET_ID,
  CKB_SYMBOL,
  toDecimalString,
  toNumber,
} from "@fiberscope/shared";

interface UpsertGraphSnapshotInput {
  prisma: PrismaClient;
  sourceName: string;
  sourceUrl: string;
  graph: FiberGraph;
}

export async function upsertGraphSnapshot({
  prisma,
  sourceName,
  sourceUrl,
  graph,
}: UpsertGraphSnapshotInput): Promise<void> {
  const source = await prisma.ingestionSource.upsert({
    where: { url: sourceUrl },
    update: { name: sourceName, lastError: null, lastPollAt: new Date() },
    create: { name: sourceName, url: sourceUrl, lastPollAt: new Date() },
  });

  const snapshot = await prisma.graphSnapshot.create({
    data: {
      sourceId: source.id,
      status: "STARTED",
    },
  });

  const seenNodes = new Set<string>();
  const seenChannels = new Set<string>();
  const advertisedAssetSymbols = assetSymbolIndexFromNodes(graph.nodes);

  try {
    await prisma.asset.upsert({
      where: { id: CKB_ASSET_ID },
      update: { symbol: CKB_SYMBOL, kind: "CKB" },
      create: { id: CKB_ASSET_ID, symbol: CKB_SYMBOL, kind: "CKB" },
    });

    for (const node of graph.nodes) {
      seenNodes.add(node.pubkey);
      const announcedTimestamp = node.timestamp === undefined ? undefined : BigInt(toNumber(node.timestamp));
      await prisma.fiberNode.upsert({
        where: { pubkey: node.pubkey },
        update: {
          nodeName: node.node_name || node.pubkey.slice(0, 12),
          version: node.version,
          addresses: node.addresses as Prisma.InputJsonValue,
          features: node.features as Prisma.InputJsonValue,
          chainHash: node.chain_hash,
          autoAcceptMinCkbFundingAmount:
            node.auto_accept_min_ckb_funding_amount === undefined
              ? undefined
              : toDecimalString(node.auto_accept_min_ckb_funding_amount),
          udtCfgInfos: jsonInput(node.udt_cfg_infos),
          announcedTimestamp,
          lastAnnouncedAt: dateFromFiberTimestamp(node.timestamp),
          lastSeenAt: new Date(),
          stale: false,
        },
        create: {
          pubkey: node.pubkey,
          nodeName: node.node_name || node.pubkey.slice(0, 12),
          version: node.version,
          addresses: node.addresses as Prisma.InputJsonValue,
          features: node.features as Prisma.InputJsonValue,
          chainHash: node.chain_hash,
          autoAcceptMinCkbFundingAmount:
            node.auto_accept_min_ckb_funding_amount === undefined
              ? null
              : toDecimalString(node.auto_accept_min_ckb_funding_amount),
          udtCfgInfos: jsonInput(node.udt_cfg_infos),
          announcedTimestamp,
          lastAnnouncedAt: dateFromFiberTimestamp(node.timestamp),
          stale: false,
        },
      });
    }

    for (const channel of graph.channels) {
      seenChannels.add(channel.channel_outpoint);
      const assetId = assetIdForScript(channel.udt_type_script, channel.chain_hash);
      await prisma.asset.upsert({
        where: { id: assetId },
        update: {
          kind: channel.udt_type_script ? "UDT" : "CKB",
          symbol: assetSymbolForScript(
            channel.udt_type_script,
            channel.chain_hash,
            advertisedAssetSymbols,
          ),
          chainHash: channel.chain_hash,
          udtTypeScript: jsonInput(channel.udt_type_script),
        },
        create: {
          id: assetId,
          kind: channel.udt_type_script ? "UDT" : "CKB",
          symbol: assetSymbolForScript(
            channel.udt_type_script,
            channel.chain_hash,
            advertisedAssetSymbols,
          ),
          chainHash: channel.chain_hash,
          udtTypeScript: jsonInput(channel.udt_type_script),
        },
      });

      await prisma.fiberChannel.upsert({
        where: { channelOutpoint: channel.channel_outpoint },
        update: {
          node1Pubkey: channel.node1,
          node2Pubkey: channel.node2,
          capacity: toDecimalString(channel.capacity),
          chainHash: channel.chain_hash,
          assetId,
          udtTypeScript: jsonInput(channel.udt_type_script),
          createdTimestamp:
            channel.created_timestamp === undefined ? undefined : BigInt(toNumber(channel.created_timestamp)),
          lastSeenAt: new Date(),
          stale: false,
        },
        create: {
          channelOutpoint: channel.channel_outpoint,
          node1Pubkey: channel.node1,
          node2Pubkey: channel.node2,
          capacity: toDecimalString(channel.capacity),
          chainHash: channel.chain_hash,
          assetId,
          udtTypeScript: jsonInput(channel.udt_type_script),
          createdTimestamp:
            channel.created_timestamp === undefined ? null : BigInt(toNumber(channel.created_timestamp)),
          stale: false,
        },
      });

      await upsertDirection(prisma, channel.channel_outpoint, channel.node1, channel.node2, channel.update_info_of_node1);
      await upsertDirection(prisma, channel.channel_outpoint, channel.node2, channel.node1, channel.update_info_of_node2);
    }

    await prisma.fiberNode.updateMany({
      where: { pubkey: { notIn: [...seenNodes] } },
      data: { stale: true },
    });
    await prisma.fiberChannel.updateMany({
      where: { channelOutpoint: { notIn: [...seenChannels] } },
      data: { stale: true },
    });

    await prisma.graphSnapshot.update({
      where: { id: snapshot.id },
      data: {
        status: "COMPLETED",
        nodeCount: graph.nodes.length,
        channelCount: graph.channels.length,
        completedAt: new Date(),
      },
    });
  } catch (error) {
    await prisma.graphSnapshot.update({
      where: { id: snapshot.id },
      data: {
        status: "FAILED",
        error: error instanceof Error ? error.message : String(error),
        completedAt: new Date(),
      },
    });
    await prisma.ingestionSource.update({
      where: { id: source.id },
      data: { lastError: error instanceof Error ? error.message : String(error) },
    });
    throw error;
  }
}

async function upsertDirection(
  prisma: PrismaClient,
  channelOutpoint: string,
  fromPubkey: string,
  toPubkey: string,
  update?: FiberChannelUpdateInfo | null,
): Promise<void> {
  if (!update) {
    return;
  }
  await prisma.channelDirection.upsert({
    where: {
      channelOutpoint_fromPubkey_toPubkey: {
        channelOutpoint,
        fromPubkey,
        toPubkey,
      },
    },
    update: directionData(update),
    create: {
      channelOutpoint,
      fromPubkey,
      toPubkey,
      ...directionData(update),
    },
  });
}

function directionData(update: FiberChannelUpdateInfo) {
  return {
    enabled: update.enabled,
    outboundLiquidity:
      update.outbound_liquidity === null || update.outbound_liquidity === undefined
        ? null
        : toDecimalString(update.outbound_liquidity),
    tlcExpiryDelta:
      update.tlc_expiry_delta === undefined ? null : BigInt(toNumber(update.tlc_expiry_delta)),
    tlcMinimumValue:
      update.tlc_minimum_value === undefined ? null : toDecimalString(update.tlc_minimum_value),
    feeRate: update.fee_rate === undefined ? null : BigInt(toNumber(update.fee_rate)),
    updatedTimestamp: update.timestamp === undefined ? null : BigInt(toNumber(update.timestamp)),
    lastSeenAt: new Date(),
  };
}

function dateFromFiberTimestamp(value?: string | number): Date | undefined {
  if (value === undefined) {
    return undefined;
  }
  const numeric = toNumber(value);
  if (numeric <= 0) {
    return undefined;
  }
  return new Date(numeric > 10_000_000_000 ? numeric : numeric * 1000);
}

function jsonInput(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (value === null || value === undefined) {
    return Prisma.JsonNull;
  }
  return value as Prisma.InputJsonValue;
}

import type { FastifyInstance } from "fastify";
import type { Prisma } from "@prisma/client";
import { estimateRoute } from "@fiberscope/route-engine";
import { CKB_ASSET_ID, toBigIntAmount } from "@fiberscope/shared";
import { prisma } from "@fiberscope/db";
import { OPENAPI_DOCUMENT } from "../openapi.js";
import { numberQuery, stringQuery } from "../query.js";
import { jsonSafe } from "../serialize.js";

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  const serviceInfo = () => ({
    name: "FiberScope API",
    status: "ok",
    health: "/health",
    openapi: "/api/openapi.json",
    summary: "/api/network/summary",
    graphExport: "/api/export/graph.json",
  });

  const health = async () => {
    const [nodeCount, channelCount] = await Promise.all([
      prisma.fiberNode.count(),
      prisma.fiberChannel.count(),
    ]);
    return { ok: true, nodeCount, channelCount };
  };

  app.get("/health", health);
  app.get("/", serviceInfo);
  app.get("/api", serviceInfo);
  app.get("/api/", serviceInfo);
  app.get("/api/health", health);

  app.get("/api/network/summary", async () => {
    const [nodes, channels, directions, assets, snapshot, reachability] =
      await Promise.all([
        prisma.fiberNode.findMany({ select: { stale: true } }),
        prisma.fiberChannel.findMany({
          select: { capacity: true, assetId: true, stale: true },
        }),
        prisma.channelDirection.findMany({ select: { enabled: true } }),
        prisma.asset.findMany(),
        prisma.graphSnapshot.findFirst({ orderBy: { startedAt: "desc" } }),
        latestReachabilitySummary(),
      ]);

    const capacityByAsset = assets.map((asset) => {
      const assetChannels = channels.filter(
        (channel) => channel.assetId === asset.id,
      );
      const capacity = assetChannels.reduce(
        (total, channel) => total + toBigIntAmount(channel.capacity),
        0n,
      );
      return {
        assetId: asset.id,
        symbol: asset.symbol,
        kind: asset.kind,
        capacity: capacity.toString(),
        channelCount: assetChannels.length,
      };
    });

    return jsonSafe({
      nodeCount: nodes.length,
      channelCount: channels.length,
      enabledDirectionCount: directions.filter((direction) => direction.enabled)
        .length,
      disabledDirectionCount: directions.filter(
        (direction) => !direction.enabled,
      ).length,
      capacityByAsset,
      staleNodeCount: nodes.filter((node) => node.stale).length,
      staleChannelCount: channels.filter((channel) => channel.stale).length,
      reachability,
      lastSnapshotAt: snapshot?.completedAt ?? snapshot?.startedAt ?? null,
    });
  });

  app.get("/api/reachability/summary", async () =>
    jsonSafe(await latestReachabilitySummary()),
  );

  app.get("/api/openapi.json", async () => OPENAPI_DOCUMENT);

  app.get("/api/network/history", async (request) => {
    const limit = numberQuery(request, "limit", 50, 250);
    const snapshots = await prisma.graphSnapshot.findMany({
      include: { source: true },
      orderBy: { startedAt: "desc" },
      take: limit,
    });
    return jsonSafe({
      snapshots: snapshots.map((snapshot) => ({
        id: snapshot.id,
        sourceName: snapshot.source.name,
        sourceUrl: snapshot.source.url,
        status: snapshot.status,
        nodeCount: snapshot.nodeCount,
        channelCount: snapshot.channelCount,
        error: snapshot.error,
        startedAt: snapshot.startedAt,
        completedAt: snapshot.completedAt,
      })),
    });
  });

  app.get("/api/ingestion/sources", async () => {
    const sources = await prisma.ingestionSource.findMany({
      include: {
        snapshots: {
          orderBy: { startedAt: "desc" },
          take: 5,
        },
      },
      orderBy: { updatedAt: "desc" },
    });
    return jsonSafe({ sources });
  });

  app.get("/api/assets", async () => {
    return jsonSafe(
      await prisma.asset.findMany({
        orderBy: [{ kind: "asc" }, { symbol: "asc" }],
      }),
    );
  });

  app.get("/api/search", async (request) => {
    const q = normalizeSearchQuery(stringQuery(request, "q"));
    const limit = numberQuery(request, "limit", 8, 25);
    if (!q) {
      return {
        query: "",
        nodes: [],
        channels: [],
        assets: [],
        routeEstimates: [],
      };
    }

    const [nodes, channels, assets, routeEstimates] = await Promise.all([
      prisma.fiberNode.findMany({
        where: {
          OR: [
            { pubkey: { contains: q, mode: "insensitive" } },
            { nodeName: { contains: q, mode: "insensitive" } },
            { chainHash: { contains: q, mode: "insensitive" } },
          ],
        },
        include: { score: true },
        orderBy: [{ stale: "asc" }, { lastSeenAt: "desc" }],
        take: limit,
      }),
      prisma.fiberChannel.findMany({
        where: {
          OR: [
            { channelOutpoint: { contains: q, mode: "insensitive" } },
            { node1Pubkey: { contains: q, mode: "insensitive" } },
            { node2Pubkey: { contains: q, mode: "insensitive" } },
            { chainHash: { contains: q, mode: "insensitive" } },
            {
              asset: {
                OR: [
                  { symbol: { contains: q, mode: "insensitive" } },
                  { id: { contains: q, mode: "insensitive" } },
                ],
              },
            },
          ],
        },
        include: { asset: true, directions: true, ckbStatus: true },
        orderBy: [{ stale: "asc" }, { lastSeenAt: "desc" }],
        take: limit,
      }),
      prisma.asset.findMany({
        where: {
          OR: [
            { id: { contains: q, mode: "insensitive" } },
            { symbol: { contains: q, mode: "insensitive" } },
            { chainHash: { contains: q, mode: "insensitive" } },
          ],
        },
        orderBy: [{ kind: "asc" }, { symbol: "asc" }],
        take: limit,
      }),
      prisma.routeEstimate.findMany({
        where: {
          OR: [
            { sourcePubkey: { contains: q, mode: "insensitive" } },
            { targetPubkey: { contains: q, mode: "insensitive" } },
            { assetId: { contains: q, mode: "insensitive" } },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
    ]);

    return jsonSafe({
      query: q,
      nodes,
      channels,
      assets,
      routeEstimates,
    });
  });

  app.get("/api/nodes", async (request) => {
    const q = stringQuery(request, "q");
    const limit = numberQuery(request, "limit", 50);
    const offset = numberQuery(request, "offset", 0, 10_000);
    const nodes = await prisma.fiberNode.findMany({
      where: q
        ? {
            OR: [
              { pubkey: { contains: q, mode: "insensitive" } },
              { nodeName: { contains: q, mode: "insensitive" } },
            ],
          }
        : undefined,
      include: { score: true },
      orderBy: [{ stale: "asc" }, { lastSeenAt: "desc" }],
      take: limit,
      skip: offset,
    });
    return jsonSafe({ nodes });
  });

  app.get("/api/nodes/:pubkey", async (request, reply) => {
    const { pubkey } = request.params as { pubkey: string };
    const node = await prisma.fiberNode.findUnique({
      where: { pubkey },
      include: {
        score: true,
        probes: { orderBy: { checkedAt: "desc" }, take: 10 },
      },
    });
    if (!node) {
      return reply.code(404).send({ error: "Node not found" });
    }
    const channels = await prisma.fiberChannel.findMany({
      where: { OR: [{ node1Pubkey: pubkey }, { node2Pubkey: pubkey }] },
      include: { asset: true, directions: true, ckbStatus: true },
      orderBy: { lastSeenAt: "desc" },
    });
    return jsonSafe({ node, channels });
  });

  app.get("/api/channels", async (request) => {
    const q = stringQuery(request, "q");
    const asset = stringQuery(request, "asset");
    const limit = numberQuery(request, "limit", 50);
    const offset = numberQuery(request, "offset", 0, 10_000);
    const assetId = asset ? await resolveAssetId(asset) : undefined;
    const channels = await prisma.fiberChannel.findMany({
      where: {
        ...(assetId ? { assetId } : {}),
        ...(q
          ? {
              OR: [
                { channelOutpoint: { contains: q, mode: "insensitive" } },
                { node1Pubkey: { contains: q, mode: "insensitive" } },
                { node2Pubkey: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: { asset: true, directions: true, ckbStatus: true },
      orderBy: [{ stale: "asc" }, { lastSeenAt: "desc" }],
      take: limit,
      skip: offset,
    });
    return jsonSafe({ channels });
  });

  app.get("/api/channels/:outpoint", async (request, reply) => {
    const { outpoint } = request.params as { outpoint: string };
    const channel = await prisma.fiberChannel.findUnique({
      where: { channelOutpoint: decodeURIComponent(outpoint) },
      include: { asset: true, directions: true, ckbStatus: true },
    });
    if (!channel) {
      return reply.code(404).send({ error: "Channel not found" });
    }
    return jsonSafe({ channel });
  });

  app.get("/api/routes/estimate", async (request, reply) => {
    const sourcePubkey = stringQuery(request, "source_pubkey");
    const targetPubkey = stringQuery(request, "target_pubkey");
    const amount = stringQuery(request, "amount");
    const assetParam = stringQuery(request, "asset") ?? CKB_ASSET_ID;
    if (!sourcePubkey || !targetPubkey || !amount) {
      return reply.code(400).send({
        error: "source_pubkey, target_pubkey, and amount are required",
      });
    }
    const assetId = await resolveAssetId(assetParam);
    const graph = await loadRouteGraph(assetId);
    const estimate = estimateRoute({
      sourcePubkey,
      targetPubkey,
      amount,
      assetId,
      ...graph,
    });

    await prisma.routeEstimate.create({
      data: {
        sourcePubkey,
        targetPubkey,
        assetId,
        amount: estimate.amount,
        canPay: estimate.canPay,
        confidence: estimate.confidence,
        estimatedFee: estimate.estimatedFee,
        hopCount: estimate.hopCount,
        warnings: asJson(estimate.warnings),
        recommendedActions: asJson(estimate.recommendedActions),
        route: asJson(estimate.route),
      },
    });

    return jsonSafe(estimate);
  });

  app.get("/api/readiness/can-pay", async (request, reply) => {
    return app
      .inject({
        method: "GET",
        url: `/api/routes/estimate?${new URLSearchParams(request.query as Record<string, string>).toString()}`,
      })
      .then((response) =>
        reply.code(response.statusCode).send(JSON.parse(response.body)),
      );
  });

  app.get("/api/readiness/can-receive", async (request, reply) => {
    const targetPubkey = stringQuery(request, "target_pubkey");
    const amount = stringQuery(request, "amount") ?? "0";
    const assetId = await resolveAssetId(
      stringQuery(request, "asset") ?? CKB_ASSET_ID,
    );
    if (!targetPubkey) {
      return reply.code(400).send({ error: "target_pubkey is required" });
    }
    const node = await prisma.fiberNode.findUnique({
      where: { pubkey: targetPubkey },
    });
    if (!node) {
      return {
        canReceive: false,
        confidence: 0,
        warnings: ["Receiver node is not known in the public graph"],
        recommendedActions: [
          "Ask the receiver to announce their node or provide route hints.",
        ],
      };
    }
    const inbound = await prisma.channelDirection.findMany({
      where: {
        toPubkey: targetPubkey,
        enabled: true,
        channel: { assetId },
      },
      include: { channel: true },
    });
    const amountValue = toBigIntAmount(amount);
    const usable = inbound.filter((direction) => {
      const min = toBigIntAmount(direction.tlcMinimumValue);
      const outbound =
        direction.outboundLiquidity === null
          ? null
          : toBigIntAmount(direction.outboundLiquidity);
      return (
        min <= amountValue && (outbound === null || outbound >= amountValue)
      );
    });
    return jsonSafe({
      canReceive: usable.length > 0,
      confidence:
        usable.length > 0 ? Math.min(0.9, 0.45 + usable.length * 0.12) : 0.15,
      inboundDirectionCount: inbound.length,
      usableInboundDirectionCount: usable.length,
      warnings:
        usable.length > 0
          ? [
              "This is public graph readiness only; private receiver policy is not visible.",
            ]
          : [
              "No public inbound direction appears able to carry this asset and amount.",
            ],
      recommendedActions:
        usable.length > 0
          ? ["Proceed, but keep invoice expiry and route hints available."]
          : ["Open or request inbound liquidity from a public routing node."],
    });
  });

  app.get("/api/liquidity/recommendations", async (request) => {
    const assetId = await resolveAssetId(
      stringQuery(request, "asset") ?? CKB_ASSET_ID,
    );
    const amount = toBigIntAmount(stringQuery(request, "amount") ?? "0");
    const nodes = await prisma.fiberNode.findMany({ include: { score: true } });
    const channels = await prisma.fiberChannel.findMany({
      where: { assetId, stale: false },
      include: { directions: true },
    });
    const recommendations = nodes
      .map((node) => {
        const related = channels.filter(
          (channel) =>
            channel.node1Pubkey === node.pubkey ||
            channel.node2Pubkey === node.pubkey,
        );
        const enabled = related
          .flatMap((channel) => channel.directions)
          .filter((direction) => direction.enabled);
        const matchingAmount = enabled.filter((direction) => {
          const outbound =
            direction.outboundLiquidity === null
              ? null
              : toBigIntAmount(direction.outboundLiquidity);
          return outbound === null || outbound >= amount;
        });
        const score =
          (node.score?.routingScore ?? 0) * 0.45 +
          (node.score?.liquidityScore ?? 0) * 0.35 +
          (node.score?.reachabilityScore ?? 0.5) * 0.2 +
          matchingAmount.length * 0.03;
        return {
          pubkey: node.pubkey,
          nodeName: node.nodeName,
          score: Math.round(score * 100) / 100,
          publicChannelCount: related.length,
          usableDirectionCount: matchingAmount.length,
          autoAcceptMinCkbFundingAmount: node.autoAcceptMinCkbFundingAmount,
        };
      })
      .filter((node) => node.publicChannelCount > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);
    return jsonSafe({ assetId, recommendations });
  });

  app.get("/api/diagnostics/explain", async (request) => {
    const message = stringQuery(request, "message") ?? "";
    const code = stringQuery(request, "code") ?? "";
    return explainFailure(`${code} ${message}`);
  });

  app.post("/api/diagnostics/explain", async (request) => {
    const body = diagnosticBody(request.body);
    const routeEstimate =
      body.source_pubkey && body.target_pubkey && body.amount
        ? await estimateDiagnosticRoute(body)
        : null;
    const base = explainFailure(`${body.code ?? ""} ${body.message ?? ""}`);
    return jsonSafe({
      ...base,
      routeEstimate,
      suppliedContext: {
        sourcePubkey: body.source_pubkey ?? null,
        targetPubkey: body.target_pubkey ?? null,
        asset: body.asset ?? CKB_ASSET_ID,
        amount: body.amount ?? null,
      },
    });
  });

  app.get("/api/export/graph.json", async () => {
    const [nodes, channels, assets, reachability] = await Promise.all([
      prisma.fiberNode.findMany({
        include: { score: true },
        orderBy: { lastSeenAt: "desc" },
      }),
      prisma.fiberChannel.findMany({
        include: { asset: true, directions: true, ckbStatus: true },
        orderBy: { lastSeenAt: "desc" },
      }),
      prisma.asset.findMany({ orderBy: [{ kind: "asc" }, { symbol: "asc" }] }),
      latestReachabilitySummary(),
    ]);
    return jsonSafe({
      generatedAt: new Date(),
      privacyBoundary:
        "Public Fiber graph announcements, optional reachability probes, and CKB funding evidence only.",
      reachability,
      assets,
      nodes,
      channels,
    });
  });

  app.get("/api/export/nodes.csv", async (_request, reply) => {
    const nodes = await prisma.fiberNode.findMany({
      include: { score: true },
      orderBy: [{ stale: "asc" }, { lastSeenAt: "desc" }],
    });
    const csv = toCsv(
      [
        "pubkey",
        "node_name",
        "version",
        "addresses",
        "chain_hash",
        "auto_accept_min_ckb_funding_amount",
        "announced_timestamp",
        "first_seen_at",
        "last_seen_at",
        "last_announced_at",
        "stale",
        "routing_score",
        "liquidity_score",
        "reachability_score",
      ],
      nodes.map((node) => ({
        pubkey: node.pubkey,
        node_name: node.nodeName,
        version: node.version,
        addresses: node.addresses,
        chain_hash: node.chainHash,
        auto_accept_min_ckb_funding_amount: node.autoAcceptMinCkbFundingAmount,
        announced_timestamp: node.announcedTimestamp,
        first_seen_at: node.firstSeenAt,
        last_seen_at: node.lastSeenAt,
        last_announced_at: node.lastAnnouncedAt,
        stale: node.stale,
        routing_score: node.score?.routingScore,
        liquidity_score: node.score?.liquidityScore,
        reachability_score: node.score?.reachabilityScore,
      })),
    );
    return reply
      .header("content-type", "text/csv; charset=utf-8")
      .header(
        "content-disposition",
        'attachment; filename="fiberscope-nodes.csv"',
      )
      .send(csv);
  });

  app.get("/api/export/channels.csv", async (_request, reply) => {
    const channels = await prisma.fiberChannel.findMany({
      include: { asset: true, directions: true, ckbStatus: true },
      orderBy: [{ stale: "asc" }, { lastSeenAt: "desc" }],
    });
    const csv = toCsv(
      [
        "channel_outpoint",
        "node1_pubkey",
        "node2_pubkey",
        "asset_id",
        "asset_symbol",
        "asset_kind",
        "capacity",
        "chain_hash",
        "created_timestamp",
        "first_seen_at",
        "last_seen_at",
        "stale",
        "enabled_direction_count",
        "direction_count",
        "ckb_status",
        "ckb_block_number",
        "ckb_explorer_url",
      ],
      channels.map((channel) => ({
        channel_outpoint: channel.channelOutpoint,
        node1_pubkey: channel.node1Pubkey,
        node2_pubkey: channel.node2Pubkey,
        asset_id: channel.assetId,
        asset_symbol: channel.asset.symbol,
        asset_kind: channel.asset.kind,
        capacity: channel.capacity,
        chain_hash: channel.chainHash,
        created_timestamp: channel.createdTimestamp,
        first_seen_at: channel.firstSeenAt,
        last_seen_at: channel.lastSeenAt,
        stale: channel.stale,
        enabled_direction_count: channel.directions.filter(
          (direction) => direction.enabled,
        ).length,
        direction_count: channel.directions.length,
        ckb_status: channel.ckbStatus?.status,
        ckb_block_number: channel.ckbStatus?.blockNumber,
        ckb_explorer_url: channel.ckbStatus?.explorerUrl,
      })),
    );
    return reply
      .header("content-type", "text/csv; charset=utf-8")
      .header(
        "content-disposition",
        'attachment; filename="fiberscope-channels.csv"',
      )
      .send(csv);
  });
}

async function resolveAssetId(input: string): Promise<string> {
  if (input === CKB_ASSET_ID || input.toUpperCase() === "CKB") {
    return CKB_ASSET_ID;
  }
  const asset = await prisma.asset.findFirst({
    where: {
      OR: [{ id: input }, { symbol: { equals: input, mode: "insensitive" } }],
    },
  });
  return asset?.id ?? input;
}

async function loadRouteGraph(assetId: string) {
  const [nodes, channels] = await Promise.all([
    prisma.fiberNode.findMany(),
    prisma.fiberChannel.findMany({
      where: { assetId },
      include: { directions: true },
    }),
  ]);
  return {
    nodes: nodes.map((node) => ({
      pubkey: node.pubkey,
      lastSeenAt: node.lastSeenAt,
      lastAnnouncedAt: node.lastAnnouncedAt,
      stale: node.stale,
    })),
    channels: channels.map((channel) => ({
      channelOutpoint: channel.channelOutpoint,
      assetId: channel.assetId,
      capacity: channel.capacity,
      stale: channel.stale,
    })),
    directions: channels.flatMap((channel) =>
      channel.directions.map((direction) => ({
        channelOutpoint: direction.channelOutpoint,
        fromPubkey: direction.fromPubkey,
        toPubkey: direction.toPubkey,
        enabled: direction.enabled,
        outboundLiquidity: direction.outboundLiquidity,
        tlcMinimumValue: direction.tlcMinimumValue,
        feeRate: direction.feeRate?.toString(),
        lastSeenAt: direction.lastSeenAt,
      })),
    ),
  };
}

function explainFailure(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("invoice") && normalized.includes("expir")) {
    return {
      category: "invoice_expired",
      explanation: "The payment request appears to be expired.",
      recommendedActions: ["Ask the receiver for a fresh invoice."],
    };
  }
  if (normalized.includes("liquidity") || normalized.includes("capacity")) {
    return {
      category: "insufficient_liquidity",
      explanation:
        "The attempted route likely lacked enough directional liquidity.",
      recommendedActions: [
        "Try a smaller amount, split the payment, or open/request liquidity.",
      ],
    };
  }
  if (normalized.includes("route") || normalized.includes("path")) {
    return {
      category: "no_route",
      explanation:
        "No usable public route was found for the payment constraints.",
      recommendedActions: [
        "Check asset support, channel status, amount, and receiver reachability.",
      ],
    };
  }
  if (normalized.includes("asset") || normalized.includes("udt")) {
    return {
      category: "asset_mismatch",
      explanation:
        "The sender and receiver may not share a routable channel asset.",
      recommendedActions: [
        "Use an asset supported by both sides or route through nodes with that UDT.",
      ],
    };
  }
  if (normalized.includes("peer") || normalized.includes("connect")) {
    return {
      category: "connectivity",
      explanation: "The failure appears related to peer connectivity.",
      recommendedActions: [
        "Reconnect peers, verify node addresses, and wait for graph gossip to refresh.",
      ],
    };
  }
  return {
    category: "unknown",
    explanation:
      "FiberScope could not classify the failure from the supplied message.",
    recommendedActions: [
      "Run a route estimate and inspect node, asset, and channel readiness.",
    ],
  };
}

interface DiagnosticRequestBody {
  message?: string;
  code?: string;
  source_pubkey?: string;
  target_pubkey?: string;
  asset?: string;
  amount?: string;
}

function diagnosticBody(value: unknown): DiagnosticRequestBody {
  if (!value || typeof value !== "object") {
    return {};
  }
  const input = value as Record<string, unknown>;
  return {
    message: stringValue(input.message),
    code: stringValue(input.code),
    source_pubkey: stringValue(input.source_pubkey),
    target_pubkey: stringValue(input.target_pubkey),
    asset: stringValue(input.asset),
    amount: stringValue(input.amount),
  };
}

async function estimateDiagnosticRoute(body: DiagnosticRequestBody) {
  if (!body.source_pubkey || !body.target_pubkey || !body.amount) {
    return null;
  }
  const assetId = await resolveAssetId(body.asset ?? CKB_ASSET_ID);
  const graph = await loadRouteGraph(assetId);
  return estimateRoute({
    sourcePubkey: body.source_pubkey,
    targetPubkey: body.target_pubkey,
    amount: body.amount,
    assetId,
    ...graph,
  });
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalizeSearchQuery(value?: string): string {
  return (value ?? "").trim().replace(/\s+/g, " ").slice(0, 160);
}

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function toCsv(
  headers: string[],
  rows: Array<Record<string, unknown>>,
): string {
  return [
    headers.join(","),
    ...rows.map((row) =>
      headers.map((header) => csvCell(row[header])).join(","),
    ),
  ].join("\n");
}

function csvCell(value: unknown): string {
  const normalized = csvValue(value);
  const escaped = normalized.replace(/"/g, '""');
  return /[",\n\r]/.test(escaped) ? `"${escaped}"` : escaped;
}

function csvValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "bigint") {
    return value.toString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "object") {
    return JSON.stringify(jsonSafe(value));
  }
  return String(value);
}

async function latestReachabilitySummary() {
  const [nodes, probes] = await Promise.all([
    prisma.fiberNode.findMany({ select: { pubkey: true } }),
    prisma.reachabilityProbe.findMany({
      orderBy: { checkedAt: "desc" },
    }),
  ]);
  const latestByNode = new Map<string, (typeof probes)[number]>();
  for (const probe of probes) {
    if (!latestByNode.has(probe.nodePubkey)) {
      latestByNode.set(probe.nodePubkey, probe);
    }
  }
  const latest = [...latestByNode.values()];
  return {
    reachableNodeCount: latest.filter((probe) => probe.success).length,
    unreachableNodeCount: latest.filter((probe) => !probe.success).length,
    unprobedNodeCount: nodes.length - latestByNode.size,
    latestProbeAt: latest[0]?.checkedAt ?? null,
  };
}

import type { RouteEstimateResponse, RouteHop } from "@fiberscope/shared";
import { FEE_RATE_DENOMINATOR, toBigIntAmount } from "@fiberscope/shared";

export interface RouteNodeInput {
  pubkey: string;
  lastSeenAt?: Date | string | null;
  lastAnnouncedAt?: Date | string | null;
  stale?: boolean;
}

export interface RouteChannelInput {
  channelOutpoint: string;
  assetId: string;
  capacity: string;
  stale?: boolean;
}

export interface RouteDirectionInput {
  channelOutpoint: string;
  fromPubkey: string;
  toPubkey: string;
  enabled: boolean;
  outboundLiquidity?: string | null;
  tlcMinimumValue?: string | null;
  feeRate?: string | number | bigint | null;
  lastSeenAt?: Date | string | null;
}

export interface EstimateRouteInput {
  sourcePubkey: string;
  targetPubkey: string;
  assetId: string;
  amount: string;
  maxFeeRate?: string | number | bigint | null;
  nodes: RouteNodeInput[];
  channels: RouteChannelInput[];
  directions: RouteDirectionInput[];
}

interface CandidateState {
  node: string;
  cost: bigint;
  fee: bigint;
  path: RouteHop[];
  confidence: number;
  warnings: string[];
  visited: Set<string>;
}

export function estimateRoute(input: EstimateRouteInput): RouteEstimateResponse {
  const amount = toBigIntAmount(input.amount);
  const nodesByPubkey = new Map(input.nodes.map((node) => [node.pubkey, node]));
  const channelsByOutpoint = new Map(input.channels.map((channel) => [channel.channelOutpoint, channel]));
  const warnings: string[] = [];
  const recommendedActions: string[] = [];

  if (!nodesByPubkey.has(input.sourcePubkey)) {
    return failure(input, "Source node is not known in the public Fiber graph", [
      "Connect the wallet node to the network and wait for graph gossip to propagate.",
    ]);
  }

  if (!nodesByPubkey.has(input.targetPubkey)) {
    return failure(input, "Target node is not known in the public Fiber graph", [
      "Ask the receiver to announce their node or provide route hints through an invoice.",
    ]);
  }

  const usableDirections = input.directions.filter((direction) => {
    const channel = channelsByOutpoint.get(direction.channelOutpoint);
    if (!channel || channel.assetId !== input.assetId || !direction.enabled) {
      return false;
    }
    const min = toBigIntAmount(direction.tlcMinimumValue);
    if (min > amount) {
      return false;
    }
    const outbound =
      direction.outboundLiquidity === null || direction.outboundLiquidity === undefined
        ? null
        : toBigIntAmount(direction.outboundLiquidity);
    return outbound === null || outbound >= amount;
  });

  if (usableDirections.length === 0) {
    return failure(input, "No enabled public channel direction can carry this amount and asset", [
      "Try a smaller amount, choose another asset, or open/fund a channel with a public routing node.",
    ]);
  }

  const adjacency = new Map<string, RouteDirectionInput[]>();
  for (const direction of usableDirections) {
    const list = adjacency.get(direction.fromPubkey) ?? [];
    list.push(direction);
    adjacency.set(direction.fromPubkey, list);
  }

  const queue: CandidateState[] = [
    {
      node: input.sourcePubkey,
      cost: 0n,
      fee: 0n,
      path: [],
      confidence: 1,
      warnings: [],
      visited: new Set([input.sourcePubkey]),
    },
  ];
  const completed: CandidateState[] = [];
  const bestCostByNode = new Map<string, bigint>([[input.sourcePubkey, 0n]]);
  const maxDepth = 8;
  const maxExpandedStates = 10_000;
  let expandedStates = 0;

  while (queue.length > 0 && completed.length === 0 && expandedStates < maxExpandedStates) {
    queue.sort((a, b) => Number(a.cost - b.cost));
    const current = queue.shift();
    if (!current) {
      break;
    }
    expandedStates += 1;

    if (current.node === input.targetPubkey) {
      completed.push(current);
      break;
    }

    if (current.path.length >= maxDepth) {
      continue;
    }

    for (const direction of adjacency.get(current.node) ?? []) {
      if (current.visited.has(direction.toPubkey)) {
        continue;
      }
      const channel = channelsByOutpoint.get(direction.channelOutpoint);
      if (!channel) {
        continue;
      }
      const feeRate = toBigIntAmount(direction.feeRate);
      const hopFee = (amount * feeRate) / FEE_RATE_DENOMINATOR;
      const hopWarnings: string[] = [];
      let confidenceImpact = 0;

      if (direction.outboundLiquidity === null || direction.outboundLiquidity === undefined) {
        hopWarnings.push("Outbound liquidity was not advertised for this direction");
        confidenceImpact += 0.12;
      }
      if (channel.stale) {
        hopWarnings.push("Channel has not appeared in the latest graph snapshot");
        confidenceImpact += 0.2;
      }
      if (isStale(direction.lastSeenAt)) {
        hopWarnings.push("Direction update is stale");
        confidenceImpact += 0.08;
      }

      const nextCost = current.cost + hopFee + 1_000n;
      const knownCost = bestCostByNode.get(direction.toPubkey);
      if (knownCost !== undefined && knownCost <= nextCost) {
        continue;
      }
      bestCostByNode.set(direction.toPubkey, nextCost);

      const visited = new Set(current.visited);
      visited.add(direction.toPubkey);
      queue.push({
        node: direction.toPubkey,
        cost: nextCost,
        fee: current.fee + hopFee,
        confidence: Math.max(0.05, current.confidence - confidenceImpact),
        warnings: [...current.warnings, ...hopWarnings],
        visited,
        path: [
          ...current.path,
          {
            channelOutpoint: direction.channelOutpoint,
            fromPubkey: direction.fromPubkey,
            toPubkey: direction.toPubkey,
            fee: hopFee.toString(),
            feeRate: feeRate.toString(),
            confidenceImpact,
            warnings: hopWarnings,
          },
        ],
      });
    }
  }

  if (completed.length === 0) {
    if (expandedStates >= maxExpandedStates) {
      return failure(input, "Route search exceeded the public graph search budget", [
        "Try a smaller amount, choose a more connected source or target, or retry with route hints.",
      ]);
    }
    return failure(input, "No route was found in the public graph", [
      "Open a channel with a better connected peer or ask the receiver for route hints.",
    ]);
  }

  const best = completed[0]!;
  if (best.path.length > 3) {
    warnings.push("Route has multiple hops, so payment reliability may be lower");
  }
  if (best.warnings.length > 0) {
    warnings.push(...dedupe(best.warnings));
  }

  return {
    canPay: true,
    confidence: roundConfidence(best.confidence - Math.max(0, best.path.length - 2) * 0.04),
    asset: input.assetId,
    amount: amount.toString(),
    estimatedFee: best.fee.toString(),
    hopCount: best.path.length,
    route: best.path,
    alternatives: completed.slice(1).map((candidate) => candidate.path),
    warnings: dedupe(warnings),
    recommendedActions:
      warnings.length > 0
        ? ["Proceed with retry logic or split the payment if the wallet supports MPP."]
        : ["Route looks usable from the public graph. Still treat this as an estimate."],
  };
}

function failure(
  input: Pick<EstimateRouteInput, "assetId" | "amount">,
  warning: string,
  recommendedActions: string[],
): RouteEstimateResponse {
  return {
    canPay: false,
    confidence: 0,
    asset: input.assetId,
    amount: toBigIntAmount(input.amount).toString(),
    estimatedFee: "0",
    hopCount: 0,
    route: [],
    alternatives: [],
    warnings: [warning],
    recommendedActions,
  };
}

function isStale(value?: Date | string | null): boolean {
  if (!value) {
    return false;
  }
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return false;
  }
  return Date.now() - timestamp > 1000 * 60 * 60 * 24;
}

function roundConfidence(value: number): number {
  return Math.max(0.01, Math.min(0.99, Math.round(value * 100) / 100));
}

function dedupe(values: string[]): string[] {
  return [...new Set(values)];
}

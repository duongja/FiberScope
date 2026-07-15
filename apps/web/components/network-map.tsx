"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { truncateMiddle } from "../lib/api";

interface NodeScore {
  routingScore: number;
  liquidityScore: number;
  reachabilityScore: number;
}

interface NodeLike {
  pubkey: string;
  nodeName: string;
  stale: boolean;
  score?: NodeScore | null;
}

interface ChannelLike {
  channelOutpoint: string;
  node1Pubkey: string;
  node2Pubkey: string;
  capacity: string;
  stale: boolean;
  asset: { symbol: string };
  directions: Array<{ enabled: boolean }>;
}

interface NetworkSummary {
  nodeCount: number;
  channelCount: number;
  enabledDirectionCount: number;
  staleChannelCount: number;
}

interface PositionedNode {
  node: NodeLike;
  stats: NodeStats;
  x: number;
  y: number;
  radius: number;
  rankScore: number;
}

interface NodeStats {
  channelCount: number;
  enabledDirections: number;
  assetSymbols: Set<string>;
}

interface EdgeGroup {
  key: string;
  from: string;
  to: string;
  count: number;
  enabledDirections: number;
  staleCount: number;
  assetCounts: Map<string, number>;
}

const assetColors = new Map([
  ["CKB", "#13a56b"],
  ["RUSD", "#12b8d7"],
  ["USDI", "#6d5dfc"],
  ["cWBTC", "#c77913"],
  ["mzBTC", "#f08d3c"],
]);

const fallbackAssetColors = [
  "#2368d9",
  "#8a9aa8",
  "#6d5dfc",
  "#12b8d7",
  "#c77913",
];
const mapWidth = 1280;
const mapHeight = 620;
const channelLimitOptions = [25, 50, 100, 200, 400] as const;

export function NetworkMap({
  nodes,
  channels,
  summary,
}: {
  nodes: NodeLike[];
  channels: ChannelLike[];
  summary: NetworkSummary;
}) {
  const [channelLimit, setChannelLimit] = useState(
    defaultChannelLimit(channels.length),
  );
  const selectedChannels = useMemo(
    () => selectChannelsByAsset(channels, channelLimit),
    [channels, channelLimit],
  );
  const topology = useMemo(
    () => buildTopology(nodes, selectedChannels),
    [nodes, selectedChannels],
  );
  const options = useMemo(
    () => availableChannelLimitOptions(channels.length),
    [channels.length],
  );

  return (
    <section className="network-map-panel">
      <div className="section-head">
        <div>
          <h2>Network map</h2>
          <p>
            {selectedChannels.length} selected channels collapsed into{" "}
            {topology.visibleEdges.length} node-to-node links.
          </p>
        </div>
        <div className="map-actions">
          <label className="map-control">
            <span>Channels</span>
            <select
              value={channelLimit}
              onChange={(event) => setChannelLimit(event.target.value)}
            >
              {options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <Link className="button secondary" href="/channels">
            Open channels
          </Link>
        </div>
      </div>

      <div className="network-map-canvas">
        <div className="channel-map-readout">
          <span>
            <strong>{selectedChannels.length}</strong> selected channels
          </span>
          <span className="readout-arrow">become</span>
          <span>
            <strong>{topology.visibleEdges.length}</strong> drawn links
          </span>
          <span>Line badge = channels between that node pair</span>
        </div>

        <svg
          className="network-map"
          preserveAspectRatio="xMidYMid slice"
          viewBox={`0 0 ${mapWidth} ${mapHeight}`}
          role="img"
          aria-label="Fiber public network topology map"
        >
          <defs>
            <pattern
              id="map-grid"
              width="44"
              height="44"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 44 0 L 0 0 0 44"
                fill="none"
                stroke="#12303b"
                strokeWidth="1"
                opacity="0.42"
              />
            </pattern>
            <radialGradient id="map-vignette" cx="50%" cy="45%" r="72%">
              <stop offset="0%" stopColor="#12303b" stopOpacity="0.78" />
              <stop offset="58%" stopColor="#0b171f" stopOpacity="0.94" />
              <stop offset="100%" stopColor="#071116" stopOpacity="1" />
            </radialGradient>
          </defs>
          <rect
            x="0"
            y="0"
            width={mapWidth}
            height={mapHeight}
            rx="8"
            fill="url(#map-vignette)"
          />
          <rect
            x="0"
            y="0"
            width={mapWidth}
            height={mapHeight}
            rx="8"
            fill="url(#map-grid)"
            opacity="0.72"
          />
          <g opacity="0.72">
            <circle
              cx="640"
              cy="300"
              r="235"
              fill="none"
              stroke="#174b58"
              strokeWidth="1"
            />
            <circle
              cx="640"
              cy="300"
              r="104"
              fill="none"
              stroke="#155a55"
              strokeWidth="1"
            />
            <line
              x1="96"
              y1="300"
              x2="1184"
              y2="300"
              stroke="#12303b"
              strokeWidth="1"
            />
            <line
              x1="640"
              y1="64"
              x2="640"
              y2="556"
              stroke="#12303b"
              strokeWidth="1"
            />
          </g>

          <g>
            {topology.visibleEdges.map((edge) => {
              const from = topology.positions.get(edge.from);
              const to = topology.positions.get(edge.to);
              if (!from || !to) {
                return null;
              }
              const activeCount = edge.count - edge.staleCount;
              const primaryAsset = primaryAssetSymbol(edge.assetCounts);
              const opacity = activeCount > 0 ? 0.88 : 0.25;
              return (
                <path
                  d={edgePath(from, to)}
                  fill="none"
                  key={edge.key}
                  opacity={opacity}
                  stroke={assetColor(primaryAsset)}
                  strokeLinecap="round"
                  strokeWidth={edgeWidth(edge)}
                  style={{
                    filter:
                      activeCount > 0
                        ? "drop-shadow(0 0 5px rgba(18, 184, 215, 0.26))"
                        : undefined,
                  }}
                >
                  <title>{edgeTitle(edge, activeCount)}</title>
                </path>
              );
            })}
          </g>

          <g>
            {topology.visibleEdges.map((edge) => {
              const from = topology.positions.get(edge.from);
              const to = topology.positions.get(edge.to);
              if (
                !from ||
                !to ||
                !shouldShowEdgeLabel(edge, topology.visibleEdges.length)
              ) {
                return null;
              }
              const label = edgeLabelPoint(from, to);
              return (
                <g
                  className="edge-count-label"
                  key={`${edge.key}:label`}
                  transform={`translate(${label.x} ${label.y})`}
                >
                  <rect x="-13" y="-10" width="26" height="20" rx="10" />
                  <text textAnchor="middle" y="4">
                    {edge.count}
                  </text>
                </g>
              );
            })}
          </g>

          <g>
            {topology.visibleNodes.map((point, index) => {
              const label = nodeLabel(point.node);
              const nodeScore = displayScore(point.rankScore);
              return (
                <a href={`/nodes/${point.node.pubkey}`} key={point.node.pubkey}>
                  <g className="network-node">
                    <circle
                      cx={point.x}
                      cy={point.y}
                      fill={
                        point.node.stale
                          ? "#60717f"
                          : nodeColor(point.rankScore)
                      }
                      opacity={point.node.stale ? "0.68" : "1"}
                      r={point.radius}
                    />
                    <circle
                      cx={point.x}
                      cy={point.y}
                      fill="none"
                      opacity="0.9"
                      r={point.radius + 7}
                      stroke={point.node.stale ? "#8a9aa8" : "#8cefd1"}
                      strokeWidth="3"
                    />
                    <text
                      fill="#ffffff"
                      fontSize={point.radius > 20 ? "13" : "11"}
                      fontWeight="760"
                      textAnchor="middle"
                      x={point.x}
                      y={point.y + 4}
                    >
                      {index + 1}
                    </text>
                    <text
                      fill="#d9edf2"
                      fontSize="12"
                      fontWeight="650"
                      textAnchor="middle"
                      x={point.x}
                      y={point.y + point.radius + 24}
                    >
                      {label}
                    </text>
                    <text
                      fill="#8fa8b2"
                      fontSize="10"
                      textAnchor="middle"
                      x={point.x}
                      y={point.y + point.radius + 39}
                    >
                      {point.stats.channelCount} channels · {nodeScore}
                    </text>
                  </g>
                </a>
              );
            })}
          </g>
        </svg>

        <div className="network-map-legend">
          {topology.assetLegend.map((asset, index) => (
            <span className="legend-item" key={asset.symbol}>
              <span
                className="legend-swatch"
                style={{ background: assetColor(asset.symbol, index) }}
              />
              {asset.symbol} <small>{asset.count}</small>
            </span>
          ))}
          <span className="legend-note">
            {topology.visibleNodes.length} nodes ·{" "}
            {topology.visibleEdges.length} links ·{" "}
            {topology.visibleChannelCount} mapped channels
          </span>
        </div>
      </div>
    </section>
  );
}

function buildTopology(nodes: NodeLike[], selectedChannels: ChannelLike[]) {
  const nodeByPubkey = new Map(nodes.map((node) => [node.pubkey, node]));
  const nodeStats = new Map<string, NodeStats>();
  const edgeGroups = new Map<string, EdgeGroup>();
  const assetCounts = new Map<string, number>();

  for (const node of nodes) {
    nodeStats.set(node.pubkey, {
      channelCount: 0,
      enabledDirections: 0,
      assetSymbols: new Set(),
    });
  }

  for (const channel of selectedChannels) {
    if (
      !nodeByPubkey.has(channel.node1Pubkey) ||
      !nodeByPubkey.has(channel.node2Pubkey)
    ) {
      continue;
    }

    const enabledDirections = channel.directions.filter(
      (direction) => direction.enabled,
    ).length;
    const symbol = channel.asset.symbol;
    assetCounts.set(symbol, (assetCounts.get(symbol) ?? 0) + 1);

    for (const pubkey of [channel.node1Pubkey, channel.node2Pubkey]) {
      const stats = nodeStats.get(pubkey);
      if (!stats) {
        continue;
      }
      stats.channelCount += 1;
      stats.enabledDirections += enabledDirections;
      stats.assetSymbols.add(symbol);
    }

    const [from, to] = [channel.node1Pubkey, channel.node2Pubkey].sort();
    const key = `${from}:${to}`;
    const edge = edgeGroups.get(key) ?? {
      key,
      from,
      to,
      count: 0,
      enabledDirections: 0,
      staleCount: 0,
      assetCounts: new Map(),
    };
    edge.count += 1;
    edge.enabledDirections += enabledDirections;
    edge.staleCount += channel.stale ? 1 : 0;
    edge.assetCounts.set(symbol, (edge.assetCounts.get(symbol) ?? 0) + 1);
    edgeGroups.set(key, edge);
  }

  const maxChannelCount = Math.max(
    ...Array.from(nodeStats.values()).map((stats) => stats.channelCount),
    1,
  );
  const rankedNodes = nodes
    .map((node) => {
      const stats = nodeStats.get(node.pubkey) ?? {
        channelCount: 0,
        enabledDirections: 0,
        assetSymbols: new Set<string>(),
      };
      return {
        node,
        stats,
        rankScore: nodeRank(node, stats, maxChannelCount),
      };
    })
    .sort(
      (left, right) =>
        right.rankScore - left.rankScore ||
        right.stats.channelCount - left.stats.channelCount ||
        left.node.nodeName.localeCompare(right.node.nodeName),
    );

  const connectedNodes = rankedNodes.filter(
    (entry) => entry.stats.channelCount > 0,
  );
  const selectedNodes = (
    connectedNodes.length ? connectedNodes : rankedNodes
  ).slice(0, 60);
  const visiblePubkeys = new Set(
    selectedNodes.map((entry) => entry.node.pubkey),
  );
  const positionedNodes = positionNodes(selectedNodes, maxChannelCount);
  const positions = new Map(
    positionedNodes.map((point) => [point.node.pubkey, point]),
  );
  const visibleEdges = Array.from(edgeGroups.values())
    .filter(
      (edge) => visiblePubkeys.has(edge.from) && visiblePubkeys.has(edge.to),
    )
    .sort((left, right) => edgeScore(right) - edgeScore(left));

  const assetLegend = Array.from(assetCounts.entries())
    .sort(
      (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
    )
    .slice(0, 6)
    .map(([symbol, count]) => ({ symbol, count }));

  return {
    visibleNodes: positionedNodes,
    positions,
    visibleEdges,
    visibleChannelCount: visibleEdges.reduce(
      (total, edge) => total + edge.count,
      0,
    ),
    hiddenNodeCount: Math.max(nodes.length - selectedNodes.length, 0),
    assetLegend,
  };
}

function positionNodes(
  rankedNodes: Array<{ node: NodeLike; stats: NodeStats; rankScore: number }>,
  maxChannelCount: number,
): PositionedNode[] {
  const centerX = mapWidth / 2;
  const centerY = mapHeight / 2 - 10;
  const nodeCount = rankedNodes.length;

  if (nodeCount <= 8) {
    return rankedNodes.map((entry, index) => {
      const angle =
        (Math.PI * 2 * index) / Math.max(nodeCount, 1) - Math.PI / 2;
      return {
        ...entry,
        x: centerX + Math.cos(angle) * 500,
        y: centerY + Math.sin(angle) * 235,
        radius: nodeRadius(entry, maxChannelCount),
      };
    });
  }

  if (nodeCount <= 18) {
    return rankedNodes.map((entry, index) => {
      const angle = (Math.PI * 2 * index) / nodeCount - Math.PI / 2;
      const radiusScale = index % 2 === 0 ? 1 : 0.74;
      return {
        ...entry,
        x: centerX + Math.cos(angle) * 500 * radiusScale,
        y: centerY + Math.sin(angle) * 235 * radiusScale,
        radius: nodeRadius(entry, maxChannelCount),
      };
    });
  }

  const ringConfigs = [
    {
      count: Math.min(10, nodeCount),
      radiusX: 510,
      radiusY: 238,
      offset: -Math.PI / 2,
    },
    {
      count: Math.min(16, Math.max(nodeCount - 10, 0)),
      radiusX: 365,
      radiusY: 168,
      offset: -Math.PI / 2 + Math.PI / 16,
    },
    {
      count: Math.max(nodeCount - 26, 0),
      radiusX: 205,
      radiusY: 94,
      offset: -Math.PI / 2 + Math.PI / 10,
    },
  ].filter((ring) => ring.count > 0);

  const positioned: PositionedNode[] = [];
  let nodeIndex = 0;
  for (const ring of ringConfigs) {
    for (let index = 0; index < ring.count; index += 1) {
      const entry = rankedNodes[nodeIndex];
      if (!entry) {
        break;
      }
      const angle = (Math.PI * 2 * index) / ring.count + ring.offset;
      positioned.push({
        ...entry,
        x: centerX + Math.cos(angle) * ring.radiusX,
        y: centerY + Math.sin(angle) * ring.radiusY,
        radius: nodeRadius(entry, maxChannelCount),
      });
      nodeIndex += 1;
    }
  }

  if (nodeIndex < nodeCount) {
    rankedNodes.slice(nodeIndex).forEach((entry, index) => {
      const angle =
        (Math.PI * 2 * index) / Math.max(nodeCount - nodeIndex, 1) -
        Math.PI / 2;
      positioned.push({
        ...entry,
        x: centerX + Math.cos(angle) * 110,
        y: centerY + Math.sin(angle) * 50,
        radius: nodeRadius(entry, maxChannelCount),
      });
    });
  }

  return positioned;
}

function nodeRank(
  node: NodeLike,
  stats: NodeStats,
  maxChannelCount: number,
): number {
  const score = node.score;
  const routing = score?.routingScore ?? 0;
  const liquidity = score?.liquidityScore ?? 0;
  const reachability = score?.reachabilityScore ?? 0;
  const channelSignal = stats.channelCount / maxChannelCount;
  const assetSignal = Math.min(stats.assetSymbols.size / 3, 1);
  const freshness = node.stale ? 0 : 1;
  return (
    routing * 0.34 +
    liquidity * 0.24 +
    reachability * 0.14 +
    channelSignal * 0.2 +
    assetSignal * 0.04 +
    freshness * 0.04
  );
}

function nodeRadius(
  entry: { stats: NodeStats; rankScore: number },
  maxChannelCount: number,
): number {
  const channelSignal = entry.stats.channelCount / maxChannelCount;
  return 11 + Math.round(entry.rankScore * 11 + channelSignal * 7);
}

function edgeScore(edge: EdgeGroup): number {
  return edge.count * 2 + edge.enabledDirections - edge.staleCount;
}

function edgeWidth(edge: EdgeGroup): number {
  return Math.min(8, 1.4 + Math.log2(edge.count + 1) * 1.55);
}

function edgePath(from: PositionedNode, to: PositionedNode): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.max(Math.hypot(dx, dy), 1);
  const normalX = -dy / distance;
  const normalY = dx / distance;
  const bow = Math.min(42, distance * 0.16);
  const controlX = (from.x + to.x) / 2 + normalX * bow;
  const controlY = (from.y + to.y) / 2 + normalY * bow;
  return `M ${from.x} ${from.y} Q ${controlX} ${controlY} ${to.x} ${to.y}`;
}

function edgeLabelPoint(
  from: PositionedNode,
  to: PositionedNode,
): { x: number; y: number } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.max(Math.hypot(dx, dy), 1);
  const normalX = -dy / distance;
  const normalY = dx / distance;
  const bow = Math.min(42, distance * 0.16);
  return {
    x: (from.x + to.x) / 2 + normalX * bow,
    y: (from.y + to.y) / 2 + normalY * bow,
  };
}

function shouldShowEdgeLabel(
  edge: EdgeGroup,
  visibleEdgeCount: number,
): boolean {
  return edge.count > 1 || visibleEdgeCount <= 45;
}

function edgeTitle(edge: EdgeGroup, activeCount: number): string {
  return `${edge.count} selected channels grouped into this line; ${activeCount} current; ${edge.enabledDirections} enabled directions; ${Array.from(edge.assetCounts.keys()).join(", ")}`;
}

function primaryAssetSymbol(assetCounts: Map<string, number>): string {
  return (
    Array.from(assetCounts.entries()).sort(
      (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
    )[0]?.[0] ?? "CKB"
  );
}

function assetColor(symbol: string, fallbackIndex = 0): string {
  return (
    assetColors.get(symbol) ??
    fallbackAssetColors[fallbackIndex % fallbackAssetColors.length]
  );
}

function nodeColor(score: number): string {
  if (score >= 0.72) {
    return "#13a56b";
  }
  if (score >= 0.46) {
    return "#12b8d7";
  }
  return "#2368d9";
}

function displayScore(value: number): string {
  return `${Math.round(Math.max(0, Math.min(value, 1)) * 100)}%`;
}

function nodeLabel(node: NodeLike): string {
  const label = node.nodeName || truncateMiddle(node.pubkey, 6, 4);
  return label.length > 18 ? `${label.slice(0, 17)}...` : label;
}

function defaultChannelLimit(channelCount: number): string {
  if (channelCount <= 50) {
    return "all";
  }
  if (channelCount <= 100) {
    return "50";
  }
  return "100";
}

function availableChannelLimitOptions(
  channelCount: number,
): Array<{ label: string; value: string }> {
  const options = channelLimitOptions
    .filter((option) => option < channelCount)
    .map((option) => ({ label: option.toString(), value: option.toString() }));
  return [...options, { label: `All ${channelCount}`, value: "all" }];
}

function selectChannelsByAsset(
  channels: ChannelLike[],
  limitValue: string,
): ChannelLike[] {
  const limit = limitValue === "all" ? channels.length : Number(limitValue);
  if (!Number.isFinite(limit) || limit >= channels.length) {
    return channels;
  }

  const groups = new Map<string, ChannelLike[]>();
  for (const channel of channels) {
    const group = groups.get(channel.asset.symbol) ?? [];
    group.push(channel);
    groups.set(channel.asset.symbol, group);
  }

  const selected: ChannelLike[] = [];
  const buckets = Array.from(groups.values()).sort(
    (left, right) => right.length - left.length,
  );
  let cursor = 0;
  while (
    selected.length < limit &&
    buckets.some((bucket) => cursor < bucket.length)
  ) {
    for (const bucket of buckets) {
      const channel = bucket[cursor];
      if (channel) {
        selected.push(channel);
        if (selected.length >= limit) {
          break;
        }
      }
    }
    cursor += 1;
  }
  return selected;
}

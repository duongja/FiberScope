import Link from "next/link";
import { formatCkb, truncateMiddle } from "../lib/api";

export interface NodeScore {
  routingScore: number;
  liquidityScore: number;
  reachabilityScore: number;
}

export interface NodeRecord {
  pubkey: string;
  nodeName: string;
  version?: string | null;
  addresses?: string[];
  stale: boolean;
  autoAcceptMinCkbFundingAmount?: string | null;
  score?: NodeScore | null;
}

interface NodeSummary {
  nodeCount: number;
  staleNodeCount: number;
  reachability: {
    reachableNodeCount: number;
    unreachableNodeCount: number;
    unprobedNodeCount: number;
  };
}

export function NetworkNodesPanel({
  nodes,
  summary,
}: {
  nodes: NodeRecord[];
  summary: NodeSummary;
}) {
  const rankedNodes = rankNodes(nodes).slice(0, 6);
  const currentNodeCount = Math.max(summary.nodeCount - summary.staleNodeCount, 0);
  const averageRouting = averageScore(nodes, "routingScore");
  const withAnnouncedAddresses = nodes.filter((node) => (node.addresses?.length ?? 0) > 0).length;

  return (
    <section className="node-panel">
      <div className="section-head">
        <div>
          <h2>Network nodes</h2>
          <p>Ranked public nodes by routing signal, liquidity signal, advertised addresses, and freshness.</p>
        </div>
        <Link className="button secondary" href="/nodes">Open directory</Link>
      </div>

      <div className="node-snapshot-grid">
        <SnapshotMetric label="Current" value={currentNodeCount.toString()} detail={`${summary.staleNodeCount} stale`} tone="green" />
        <SnapshotMetric label="Addressed" value={withAnnouncedAddresses.toString()} detail={`${nodes.length} sampled`} tone="blue" />
        <SnapshotMetric label="Reachability" value={`${summary.reachability.reachableNodeCount}/${summary.nodeCount}`} detail={`${summary.reachability.unprobedNodeCount} unprobed`} tone="neutral" />
        <SnapshotMetric label="Avg routing" value={`${averageRouting}%`} detail="sampled top nodes" tone="neutral" />
      </div>

      <div className="node-rank-list">
        {rankedNodes.map((node, index) => (
          <NodeRankRow key={node.pubkey} node={node} rank={index + 1} />
        ))}
      </div>
    </section>
  );
}

export function NodeDirectory({ nodes }: { nodes: NodeRecord[] }) {
  const currentNodeCount = nodes.filter((node) => !node.stale).length;
  const staleNodeCount = nodes.length - currentNodeCount;
  const addressedNodeCount = nodes.filter((node) => (node.addresses?.length ?? 0) > 0).length;
  const topLiquidityNode = rankNodes(nodes)[0];

  return (
    <div className="node-directory">
      <div className="node-snapshot-grid">
        <SnapshotMetric label="Listed nodes" value={nodes.length.toString()} detail={`${currentNodeCount} current`} tone="green" />
        <SnapshotMetric label="Announced addresses" value={addressedNodeCount.toString()} detail={`${staleNodeCount} stale`} tone="blue" />
        <SnapshotMetric label="Avg routing" value={`${averageScore(nodes, "routingScore")}%`} detail="all listed nodes" tone="neutral" />
        <SnapshotMetric label="Top liquidity" value={topLiquidityNode ? percent(topLiquidityNode.score?.liquidityScore) : "0%"} detail={topLiquidityNode?.nodeName ?? "unavailable"} tone="neutral" />
      </div>

      <div className="table-wrap node-table-wrap">
        <table className="node-table">
          <thead>
            <tr>
              <th>Node</th>
              <th>Connectivity</th>
              <th>Scores</th>
              <th>Channel readiness</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rankNodes(nodes).map((node) => (
              <tr key={node.pubkey}>
                <td>
                  <div className="node-title-cell">
                    <Link href={`/nodes/${node.pubkey}`}><strong>{node.nodeName}</strong></Link>
                    <span className="mono">{truncateMiddle(node.pubkey)}</span>
                  </div>
                </td>
                <td>
                  <div className="node-meta-stack">
                    <span>{node.version ?? "version unknown"}</span>
                    <span className="muted">{node.addresses?.length ?? 0} announced addresses</span>
                  </div>
                </td>
                <td>
                  <div className="score-stack">
                    <ScoreBar label="Routing" value={node.score?.routingScore ?? 0} />
                    <ScoreBar label="Liquidity" value={node.score?.liquidityScore ?? 0} />
                    <ScoreBar label="Reachability" value={node.score?.reachabilityScore ?? 0} />
                  </div>
                </td>
                <td>
                  <div className="node-meta-stack">
                    <span>{node.autoAcceptMinCkbFundingAmount ? formatCkb(node.autoAcceptMinCkbFundingAmount) : "not advertised"}</span>
                    <span className="muted">auto-accept minimum</span>
                  </div>
                </td>
                <td><NodeStatus node={node} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NodeRankRow({ node, rank }: { node: NodeRecord; rank: number }) {
  const score = node.score;
  return (
    <Link className="node-rank-row" href={`/nodes/${node.pubkey}`}>
      <div className="rank-index">{rank}</div>
      <div className="node-rank-main">
        <div className="node-rank-title">
          <strong>{node.nodeName}</strong>
          <NodeStatus node={node} />
        </div>
        <div className="node-rank-meta">
          <span className="mono">{truncateMiddle(node.pubkey)}</span>
          <span>{node.addresses?.length ?? 0} addresses</span>
          <span>{node.version ?? "version unknown"}</span>
        </div>
      </div>
      <div className="node-rank-scores">
        <ScorePill label="Route" value={score?.routingScore ?? 0} />
        <ScorePill label="Liq" value={score?.liquidityScore ?? 0} />
      </div>
    </Link>
  );
}

function SnapshotMetric({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone: "green" | "blue" | "neutral";
}) {
  return (
    <div className={`snapshot-metric ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function NodeStatus({ node }: { node: NodeRecord }) {
  return <span className={`badge ${node.stale ? "orange" : "green"}`}>{node.stale ? "stale" : "current"}</span>;
}

function ScorePill({ label, value }: { label: string; value: number }) {
  return (
    <span className="score-pill">
      <span>{label}</span>
      <strong>{percent(value)}</strong>
    </span>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const clamped = clampScore(value);
  return (
    <div className="score-line">
      <div className="score-line-head">
        <span>{label}</span>
        <strong>{percent(clamped)}</strong>
      </div>
      <div className="score-track">
        <div className="score-fill" style={{ width: `${Math.round(clamped * 100)}%` }} />
      </div>
    </div>
  );
}

function rankNodes(nodes: NodeRecord[]): NodeRecord[] {
  return [...nodes].sort((left, right) => nodeRank(right) - nodeRank(left) || left.nodeName.localeCompare(right.nodeName));
}

function nodeRank(node: NodeRecord): number {
  const score = node.score;
  const routing = score?.routingScore ?? 0;
  const liquidity = score?.liquidityScore ?? 0;
  const reachability = score?.reachabilityScore ?? 0;
  const addressSignal = Math.min((node.addresses?.length ?? 0) / 3, 1);
  const freshness = node.stale ? 0 : 1;
  return routing * 0.42 + liquidity * 0.32 + reachability * 0.16 + addressSignal * 0.06 + freshness * 0.04;
}

function averageScore(nodes: NodeRecord[], key: keyof NodeScore): number {
  if (nodes.length === 0) {
    return 0;
  }
  const total = nodes.reduce((sum, node) => sum + (node.score?.[key] ?? 0), 0);
  return Math.round((total / nodes.length) * 100);
}

function percent(value: number | undefined): string {
  return `${Math.round(clampScore(value ?? 0) * 100)}%`;
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(value, 1));
}

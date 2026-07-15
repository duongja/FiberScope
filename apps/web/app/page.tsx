import Link from "next/link";
import { NetworkMap } from "../components/network-map";
import {
  NetworkNodesPanel,
  type NodeRecord,
} from "../components/node-sections";
import { StatCard } from "../components/stat-card";
import { apiGet, formatCkb, truncateMiddle } from "../lib/api";

interface Summary {
  nodeCount: number;
  channelCount: number;
  enabledDirectionCount: number;
  disabledDirectionCount: number;
  capacityByAsset: Array<{
    assetId: string;
    symbol: string;
    kind: string;
    capacity: string;
    channelCount: number;
  }>;
  staleNodeCount: number;
  staleChannelCount: number;
  reachability: {
    reachableNodeCount: number;
    unreachableNodeCount: number;
    unprobedNodeCount: number;
    latestProbeAt: string | null;
  };
  lastSnapshotAt: string | null;
}

interface NodesResponse {
  nodes: NodeRecord[];
}

interface ChannelsResponse {
  channels: Array<{
    channelOutpoint: string;
    node1Pubkey: string;
    node2Pubkey: string;
    capacity: string;
    stale: boolean;
    asset: { symbol: string };
    directions: Array<{ enabled: boolean }>;
  }>;
}

export default async function HomePage() {
  const summary = await apiGet<Summary>("/api/network/summary");
  const [nodes, channels] = await Promise.all([
    apiGet<NodesResponse>("/api/nodes?limit=100"),
    apiGet<ChannelsResponse>("/api/channels?limit=200"),
  ]);
  const recentChannels = channels.channels.slice(0, 10);
  const mapChannels = dedupeChannels(channels.channels);
  const ckbCapacity =
    summary.capacityByAsset.find((asset) => asset.symbol === "CKB")?.capacity ??
    "0";

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Fiber network readiness</h1>
          <p>
            Public graph visibility, liquidity direction, route estimates, and
            wallet-builder APIs for Fiber Network.
          </p>
        </div>
      </div>

      <section className="grid cols-4">
        <StatCard
          label="Public nodes"
          value={summary.nodeCount}
          detail={`${summary.staleNodeCount} stale`}
        />
        <StatCard
          label="Public channels"
          value={summary.channelCount}
          detail={`${summary.staleChannelCount} stale`}
        />
        <StatCard
          label="Enabled directions"
          value={summary.enabledDirectionCount}
          detail={`${summary.disabledDirectionCount} disabled`}
        />
        <StatCard
          label="Reachable nodes"
          value={`${summary.reachability.reachableNodeCount}/${summary.nodeCount}`}
          detail={`${summary.reachability.unreachableNodeCount} unreachable · ${summary.reachability.unprobedNodeCount} unprobed`}
        />
      </section>

      <section style={{ marginTop: 16 }}>
        <NetworkMap
          nodes={nodes.nodes}
          channels={mapChannels}
          summary={summary}
        />
      </section>

      <section className="home-insights-grid">
        <NetworkNodesPanel nodes={nodes.nodes} summary={summary} />

        <div className="card home-capacity-card">
          <h2 style={{ marginTop: 0 }}>Capacity by asset</h2>
          <p className="muted">
            Total public CKB capacity: {formatCkb(ckbCapacity)}
          </p>
          <div className="asset-list">
            {summary.capacityByAsset.map((asset) => (
              <div className="asset-row" key={asset.assetId}>
                <div>
                  <strong>{asset.symbol}</strong>
                  <div className="muted">
                    {asset.kind} · {asset.channelCount} channels
                  </div>
                </div>
                <div className="mono asset-amount">
                  {asset.symbol === "CKB"
                    ? formatCkb(asset.capacity)
                    : asset.capacity}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card home-recent-card">
          <h2 style={{ marginTop: 0 }}>Recent channels</h2>
          <div className="table-wrap">
            <table className="compact-table">
              <thead>
                <tr>
                  <th>Outpoint</th>
                  <th>Asset</th>
                  <th>Capacity</th>
                </tr>
              </thead>
              <tbody>
                {recentChannels.map((channel) => (
                  <tr key={channel.channelOutpoint}>
                    <td>
                      <Link
                        className="mono"
                        href={`/channels/${encodeURIComponent(channel.channelOutpoint)}`}
                      >
                        {truncateMiddle(channel.channelOutpoint)}
                      </Link>
                    </td>
                    <td>{channel.asset.symbol}</td>
                    <td>
                      {channel.asset.symbol === "CKB"
                        ? formatCkb(channel.capacity)
                        : channel.capacity}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
}

function dedupeChannels(
  channels: ChannelsResponse["channels"],
): ChannelsResponse["channels"] {
  const seen = new Set<string>();
  return channels.filter((channel) => {
    if (seen.has(channel.channelOutpoint)) {
      return false;
    }
    seen.add(channel.channelOutpoint);
    return true;
  });
}

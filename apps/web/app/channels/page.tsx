import Link from "next/link";
import { StatusBadge } from "../../components/status-badge";
import { apiGet, formatCkb, truncateMiddle } from "../../lib/api";

interface ChannelsResponse {
  channels: Array<{
    channelOutpoint: string;
    node1Pubkey: string;
    node2Pubkey: string;
    capacity: string;
    stale: boolean;
    asset: { symbol: string; kind: string };
    directions: Array<{ enabled: boolean }>;
    ckbStatus?: { status: string; explorerUrl?: string | null } | null;
  }>;
}

export default async function ChannelsPage() {
  const { channels } = await apiGet<ChannelsResponse>("/api/channels?limit=100");

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Public channels</h1>
          <p>Inspect public channel capacity, asset type, directional status, and CKB funding status.</p>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Channel</th>
              <th>Nodes</th>
              <th>Asset</th>
              <th>Capacity</th>
              <th>Directions</th>
              <th>On-chain</th>
            </tr>
          </thead>
          <tbody>
            {channels.map((channel) => (
              <tr key={channel.channelOutpoint}>
                <td><Link className="mono" href={`/channels/${encodeURIComponent(channel.channelOutpoint)}`}>{truncateMiddle(channel.channelOutpoint)}</Link></td>
                <td className="mono">{truncateMiddle(channel.node1Pubkey, 8, 4)} / {truncateMiddle(channel.node2Pubkey, 8, 4)}</td>
                <td>{channel.asset.symbol}</td>
                <td>{channel.asset.symbol === "CKB" ? formatCkb(channel.capacity) : channel.capacity}</td>
                <td>{channel.directions.filter((direction) => direction.enabled).length}/{channel.directions.length} enabled</td>
                <td><StatusBadge enabled={channel.ckbStatus?.status === "LIVE"} label={channel.ckbStatus?.status ?? "unknown"} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

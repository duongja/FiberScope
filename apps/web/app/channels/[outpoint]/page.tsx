import Link from "next/link";
import { StatusBadge } from "../../../components/status-badge";
import { StatCard } from "../../../components/stat-card";
import { apiGet, formatCkb, truncateMiddle } from "../../../lib/api";

interface ChannelDetail {
  channel: {
    channelOutpoint: string;
    node1Pubkey: string;
    node2Pubkey: string;
    capacity: string;
    createdTimestamp?: string | null;
    stale: boolean;
    asset: { symbol: string; kind: string };
    ckbStatus?: { status: string; explorerUrl?: string | null; error?: string | null } | null;
    directions: Array<{
      fromPubkey: string;
      toPubkey: string;
      enabled: boolean;
      outboundLiquidity?: string | null;
      tlcMinimumValue?: string | null;
      tlcExpiryDelta?: string | null;
      feeRate?: string | null;
    }>;
  };
}

export default async function ChannelDetailPage({ params }: { params: Promise<{ outpoint: string }> }) {
  const { outpoint } = await params;
  const { channel } = await apiGet<ChannelDetail>(`/api/channels/${encodeURIComponent(outpoint)}`);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Channel detail</h1>
          <p className="mono">{channel.channelOutpoint}</p>
        </div>
        <StatusBadge enabled={channel.ckbStatus?.status === "LIVE"} label={channel.ckbStatus?.status ?? "on-chain unknown"} />
      </div>
      <section className="grid cols-4">
        <StatCard label="Asset" value={channel.asset.symbol} detail={channel.asset.kind} />
        <StatCard label="Capacity" value={channel.asset.symbol === "CKB" ? formatCkb(channel.capacity) : channel.capacity} />
        <StatCard label="Enabled directions" value={`${channel.directions.filter((direction) => direction.enabled).length}/${channel.directions.length}`} />
        <StatCard label="Graph status" value={channel.stale ? "Stale" : "Current"} />
      </section>

      <section className="grid cols-2" style={{ marginTop: 16 }}>
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Participants</h2>
          <p><Link className="mono" href={`/nodes/${channel.node1Pubkey}`}>{channel.node1Pubkey}</Link></p>
          <p><Link className="mono" href={`/nodes/${channel.node2Pubkey}`}>{channel.node2Pubkey}</Link></p>
        </div>
        <div className="card">
          <h2 style={{ marginTop: 0 }}>CKB evidence</h2>
          <p>Status: <strong>{channel.ckbStatus?.status ?? "unknown"}</strong></p>
          {channel.ckbStatus?.explorerUrl ? <p><a className="button secondary" href={channel.ckbStatus.explorerUrl} target="_blank" rel="noreferrer">Open funding tx</a></p> : <p className="muted">No explorer link available.</p>}
          {channel.ckbStatus?.error ? <p className="muted">{channel.ckbStatus.error}</p> : null}
        </div>
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <h2 style={{ marginTop: 0 }}>Directional liquidity</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Direction</th>
                <th>Status</th>
                <th>Outbound liquidity</th>
                <th>TLC minimum</th>
                <th>Expiry delta</th>
                <th>Fee rate</th>
              </tr>
            </thead>
            <tbody>
              {channel.directions.map((direction) => (
                <tr key={`${direction.fromPubkey}-${direction.toPubkey}`}>
                  <td className="mono">{truncateMiddle(direction.fromPubkey, 8, 4)} → {truncateMiddle(direction.toPubkey, 8, 4)}</td>
                  <td><StatusBadge enabled={direction.enabled} /></td>
                  <td>{direction.outboundLiquidity ?? "not advertised"}</td>
                  <td>{direction.tlcMinimumValue ?? "unknown"}</td>
                  <td>{direction.tlcExpiryDelta ?? "unknown"}</td>
                  <td>{direction.feeRate ?? "unknown"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

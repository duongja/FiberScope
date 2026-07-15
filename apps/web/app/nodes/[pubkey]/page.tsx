import Link from "next/link";
import { StatCard } from "../../../components/stat-card";
import { apiGetOrNull, formatCkb, truncateMiddle } from "../../../lib/api";

interface NodeDetail {
  node: {
    pubkey: string;
    nodeName: string;
    version?: string;
    addresses: string[];
    features: string[];
    autoAcceptMinCkbFundingAmount?: string | null;
    stale: boolean;
    score?: { routingScore: number; liquidityScore: number; reachabilityScore: number } | null;
    probes: Array<{
      address: string;
      success: boolean;
      latencyMs?: number | null;
      error?: string | null;
      checkedAt: string;
    }>;
  };
  channels: Array<{
    channelOutpoint: string;
    node1Pubkey: string;
    node2Pubkey: string;
    capacity: string;
    asset: { symbol: string };
    directions: Array<{ fromPubkey: string; toPubkey: string; enabled: boolean; feeRate?: string | null }>;
  }>;
}

export default async function NodeDetailPage({ params }: { params: Promise<{ pubkey: string }> }) {
  const { pubkey } = await params;
  const detail = await apiGetOrNull<NodeDetail>(`/api/nodes/${pubkey}`);
  if (!detail) {
    return (
      <>
        <div className="page-head">
          <div>
            <h1>Node not indexed</h1>
            <p className="mono">{pubkey}</p>
          </div>
          <span className="badge orange">not found</span>
        </div>

        <section className="card missing-entity-card">
          <h2>What this means</h2>
          <p className="muted">
            This pubkey is referenced by the public graph, but the node
            announcement is not currently indexed as a node record. This can
            happen when a channel remains visible while one participant has not
            announced fresh node metadata.
          </p>
          <div className="missing-entity-actions">
            <Link
              className="button"
              href={`/search?q=${encodeURIComponent(pubkey)}`}
            >
              Search references
            </Link>
            <Link
              className="button secondary"
              href={`/channels?q=${encodeURIComponent(pubkey)}`}
            >
              View related channels
            </Link>
          </div>
        </section>
      </>
    );
  }

  const { node, channels } = detail;
  const enabledDirections = channels.flatMap((channel) => channel.directions).filter((direction) => direction.enabled);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{node.nodeName}</h1>
          <p className="mono">{node.pubkey}</p>
        </div>
        <span className={`badge ${node.stale ? "orange" : "green"}`}>{node.stale ? "stale" : "current"}</span>
      </div>
      <section className="grid cols-4">
        <StatCard label="Public channels" value={channels.length} />
        <StatCard label="Enabled directions" value={enabledDirections.length} />
        <StatCard label="Routing score" value={`${Math.round((node.score?.routingScore ?? 0) * 100)}%`} />
        <StatCard label="Reachability" value={`${Math.round((node.score?.reachabilityScore ?? 0.5) * 100)}%`} />
      </section>

      <section className="grid cols-2" style={{ marginTop: 16 }}>
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Addresses</h2>
          <div className="grid">
            {node.addresses?.map((address) => <div className="mono" key={address}>{address}</div>)}
          </div>
        </div>
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Features</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {node.features?.length ? node.features.map((feature) => <span className="badge" key={feature}>{feature}</span>) : <span className="muted">No features announced</span>}
          </div>
        </div>
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <h2 style={{ marginTop: 0 }}>Reachability probes</h2>
        {node.probes.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Address</th>
                  <th>Status</th>
                  <th>Latency</th>
                  <th>Checked</th>
                  <th>Error</th>
                </tr>
              </thead>
              <tbody>
                {node.probes.map((probe) => (
                  <tr key={`${probe.address}-${probe.checkedAt}`}>
                    <td className="mono">{probe.address}</td>
                    <td><span className={`badge ${probe.success ? "green" : "red"}`}>{probe.success ? "reachable" : "failed"}</span></td>
                    <td>{probe.latencyMs === null || probe.latencyMs === undefined ? "unknown" : `${probe.latencyMs} ms`}</td>
                    <td>{new Date(probe.checkedAt).toLocaleString()}</td>
                    <td className="muted">{probe.error ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">No reachability probes have been recorded for this node.</p>
        )}
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <h2 style={{ marginTop: 0 }}>Channels</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Outpoint</th>
                <th>Peer</th>
                <th>Asset</th>
                <th>Capacity</th>
                <th>Directions</th>
              </tr>
            </thead>
            <tbody>
              {channels.map((channel) => {
                const peer = channel.node1Pubkey === node.pubkey ? channel.node2Pubkey : channel.node1Pubkey;
                return (
                  <tr key={channel.channelOutpoint}>
                    <td><Link className="mono" href={`/channels/${encodeURIComponent(channel.channelOutpoint)}`}>{truncateMiddle(channel.channelOutpoint)}</Link></td>
                    <td className="mono">{truncateMiddle(peer)}</td>
                    <td>{channel.asset.symbol}</td>
                    <td>{channel.asset.symbol === "CKB" ? formatCkb(channel.capacity) : channel.capacity}</td>
                    <td>{channel.directions.filter((direction) => direction.enabled).length}/{channel.directions.length} enabled</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

import Link from "next/link";
import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { StatusBadge } from "../../components/status-badge";
import { apiGet, formatCkb, truncateMiddle } from "../../lib/api";

interface SearchResponse {
  query: string;
  nodes: Array<{
    pubkey: string;
    nodeName: string;
    version?: string | null;
    stale: boolean;
    lastSeenAt: string;
    score?: {
      routingScore: number;
      liquidityScore: number;
      reachabilityScore: number;
    } | null;
  }>;
  channels: Array<{
    channelOutpoint: string;
    node1Pubkey: string;
    node2Pubkey: string;
    capacity: string;
    stale: boolean;
    asset: { id: string; symbol: string; kind: string };
    directions: Array<{ enabled: boolean }>;
    ckbStatus?: { status: string; explorerUrl?: string | null } | null;
  }>;
  assets: Array<{
    id: string;
    symbol: string;
    kind: string;
    chainHash?: string | null;
  }>;
  routeEstimates: Array<{
    id: string;
    sourcePubkey: string;
    targetPubkey: string;
    assetId: string;
    amount: string;
    canPay: boolean;
    confidence: number;
    estimatedFee: string;
    hopCount: number;
    createdAt: string;
  }>;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const query = (params.q ?? "").trim();
  const results = query
    ? await apiGet<SearchResponse>(
        `/api/search?q=${encodeURIComponent(query)}&limit=8`,
      )
    : null;
  const resultCount = results
    ? results.nodes.length +
      results.channels.length +
      results.assets.length +
      results.routeEstimates.length
    : 0;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Network intelligence search</h1>
          <p>
            Paste a pubkey, channel outpoint, asset symbol, UDT id, chain hash,
            or text fragment to jump into the indexed Fiber graph.
          </p>
        </div>
      </div>

      <section className="search-workbench">
        <form action="/search" className="search-box">
          <Search size={20} aria-hidden="true" />
          <input
            aria-label="Search FiberScope"
            className="search-input"
            defaultValue={query}
            name="q"
            placeholder="Search node pubkey, channel outpoint, CKB, RUSD, UDT id..."
            type="search"
          />
          <button className="button" type="submit">
            Search
          </button>
        </form>

        {query ? (
          <div className="search-meta">
            <span className="badge green">{resultCount} matches</span>
            <span className="muted mono">{truncateMiddle(query, 18, 14)}</span>
          </div>
        ) : (
          <div className="search-hints">
            <span>Try `CKB`</span>
            <span>`RUSD`</span>
            <span>`0x...00000000` channel outpoint</span>
            <span>`03...` node pubkey</span>
          </div>
        )}
      </section>

      {results ? (
        resultCount > 0 ? (
          <section className="search-results-grid">
            <ResultCard title="Nodes" count={results.nodes.length}>
              {results.nodes.length ? (
                <div className="result-list">
                  {results.nodes.map((node) => (
                    <Link
                      className="result-row"
                      href={`/nodes/${node.pubkey}`}
                      key={node.pubkey}
                    >
                      <div>
                        <strong>{node.nodeName}</strong>
                        <div className="muted mono">
                          {truncateMiddle(node.pubkey)}
                        </div>
                      </div>
                      <div className="result-row-meta">
                        <StatusBadge
                          enabled={!node.stale}
                          label={node.stale ? "stale" : "fresh"}
                        />
                        <span>
                          score{" "}
                          {Math.round((node.score?.routingScore ?? 0) * 100)}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyCategory />
              )}
            </ResultCard>

            <ResultCard title="Channels" count={results.channels.length}>
              {results.channels.length ? (
                <div className="result-list">
                  {results.channels.map((channel) => (
                    <Link
                      className="result-row"
                      href={`/channels/${encodeURIComponent(channel.channelOutpoint)}`}
                      key={channel.channelOutpoint}
                    >
                      <div>
                        <strong className="mono">
                          {truncateMiddle(channel.channelOutpoint)}
                        </strong>
                        <div className="muted">
                          {channel.asset.symbol} ·{" "}
                          {channel.asset.symbol === "CKB"
                            ? formatCkb(channel.capacity)
                            : channel.capacity}
                        </div>
                      </div>
                      <div className="result-row-meta">
                        <StatusBadge
                          enabled={!channel.stale}
                          label={channel.stale ? "stale" : "fresh"}
                        />
                        <span>
                          {
                            channel.directions.filter(
                              (direction) => direction.enabled,
                            ).length
                          }
                          /{channel.directions.length} enabled
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyCategory />
              )}
            </ResultCard>

            <ResultCard title="Assets" count={results.assets.length}>
              {results.assets.length ? (
                <div className="result-list">
                  {results.assets.map((asset) => (
                    <Link
                      className="result-row"
                      href={`/channels?asset=${encodeURIComponent(asset.symbol)}`}
                      key={asset.id}
                    >
                      <div>
                        <strong>{asset.symbol}</strong>
                        <div className="muted mono">
                          {truncateMiddle(asset.id)}
                        </div>
                      </div>
                      <div className="result-row-meta">
                        <span className="badge">{asset.kind}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyCategory />
              )}
            </ResultCard>

            <ResultCard
              title="Route history"
              count={results.routeEstimates.length}
            >
              {results.routeEstimates.length ? (
                <div className="result-list">
                  {results.routeEstimates.map((estimate) => (
                    <Link
                      className="result-row"
                      href={`/routes?source_pubkey=${encodeURIComponent(estimate.sourcePubkey)}&target_pubkey=${encodeURIComponent(estimate.targetPubkey)}&asset=${encodeURIComponent(estimate.assetId)}&amount=${encodeURIComponent(estimate.amount)}`}
                      key={estimate.id}
                    >
                      <div>
                        <strong>
                          {estimate.canPay ? "Payable route" : "Failed route"}
                        </strong>
                        <div className="muted mono">
                          {truncateMiddle(estimate.sourcePubkey, 8, 4)} to{" "}
                          {truncateMiddle(estimate.targetPubkey, 8, 4)}
                        </div>
                      </div>
                      <div className="result-row-meta">
                        <StatusBadge
                          enabled={estimate.canPay}
                          label={estimate.canPay ? "can pay" : "blocked"}
                        />
                        <span>{estimate.hopCount} hops</span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyCategory />
              )}
            </ResultCard>
          </section>
        ) : (
          <section className="route-empty-state search-empty">
            <Search size={28} aria-hidden="true" />
            <h2>No matches found</h2>
            <p>
              Try a shorter pubkey fragment, an exact channel outpoint, or an
              asset symbol such as CKB or RUSD.
            </p>
          </section>
        )
      ) : null}
    </>
  );
}

function ResultCard({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <div className="card search-result-card">
      <div className="result-card-head">
        <h2>{title}</h2>
        <span className="badge">{count}</span>
      </div>
      {children}
    </div>
  );
}

function EmptyCategory() {
  return <p className="muted search-category-empty">No matches in this category.</p>;
}

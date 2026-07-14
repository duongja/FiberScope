import Link from "next/link";
import { apiGet, formatCkb, truncateMiddle } from "../../lib/api";

interface RecommendationsResponse {
  assetId: string;
  recommendations: Array<{
    pubkey: string;
    nodeName: string;
    score: number;
    publicChannelCount: number;
    usableDirectionCount: number;
    autoAcceptMinCkbFundingAmount?: string | null;
  }>;
}

export default async function LiquidityPage() {
  const { recommendations } = await apiGet<RecommendationsResponse>(
    "/api/liquidity/recommendations?asset=CKB&amount=100000000",
  );

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Liquidity recommendations</h1>
          <p>Rank public peers that look useful for wallets opening channels or searching for routable liquidity.</p>
        </div>
      </div>
      <div className="callout" style={{ marginBottom: 16 }}>
        Recommendations use public graph data only. They are useful for peer discovery, but wallets still need their own
        channel state to know exact inbound and outbound liquidity.
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Node</th>
              <th>Pubkey</th>
              <th>Score</th>
              <th>Channels</th>
              <th>Usable directions</th>
              <th>Auto-accept min</th>
            </tr>
          </thead>
          <tbody>
            {recommendations.map((node) => (
              <tr key={node.pubkey}>
                <td><Link href={`/nodes/${node.pubkey}`}><strong>{node.nodeName}</strong></Link></td>
                <td className="mono">{truncateMiddle(node.pubkey)}</td>
                <td>{Math.round(node.score * 100)}%</td>
                <td>{node.publicChannelCount}</td>
                <td>{node.usableDirectionCount}</td>
                <td>{node.autoAcceptMinCkbFundingAmount ? formatCkb(node.autoAcceptMinCkbFundingAmount) : "unknown"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

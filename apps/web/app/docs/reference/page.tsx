import { DocsHeader, EndpointRow } from "../_shared";

export default function ReferenceDocsPage() {
  return (
    <>
      <DocsHeader
        title="Endpoint reference"
        description="Compact reference for FiberScope's public read-only HTTP endpoints."
      />

      <section className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Endpoint</th>
                <th>Purpose</th>
                <th>Primary consumer</th>
              </tr>
            </thead>
            <tbody>
              <EndpointRow
                path="/health"
                purpose="Service health and indexed graph counts."
                consumer="deployment checks"
              />
              <EndpointRow
                path="/api/network/summary"
                purpose="Current public graph summary."
                consumer="dashboards"
              />
              <EndpointRow
                path="/api/network/history"
                purpose="Recent ingestion snapshots."
                consumer="operators"
              />
              <EndpointRow
                path="/api/ingestion/sources"
                purpose="Configured graph sources and recent poll state."
                consumer="operators"
              />
              <EndpointRow
                path="/api/assets"
                purpose="Indexed CKB and UDT assets."
                consumer="wallets"
              />
              <EndpointRow
                path="/api/nodes"
                purpose="Search indexed Fiber nodes."
                consumer="explorers, wallets"
              />
              <EndpointRow
                path="/api/nodes/:pubkey"
                purpose="Node detail, channels, score, and reachability probes."
                consumer="explorers"
              />
              <EndpointRow
                path="/api/channels"
                purpose="Search indexed public channels."
                consumer="explorers, operators"
              />
              <EndpointRow
                path="/api/channels/:outpoint"
                purpose="Channel detail with directions and CKB evidence."
                consumer="explorers"
              />
              <EndpointRow
                path="/api/routes/estimate"
                purpose="Estimate route readiness for a payment."
                consumer="wallets"
              />
              <EndpointRow
                path="/api/readiness/can-pay"
                purpose="Wallet-friendly alias for route readiness."
                consumer="wallet send flows"
              />
              <EndpointRow
                path="/api/readiness/can-receive"
                purpose="Estimate receiver inbound readiness."
                consumer="wallet receive flows"
              />
              <EndpointRow
                path="/api/liquidity/recommendations"
                purpose="Rank public peers for channel opening."
                consumer="wallets, LSP tooling"
              />
              <EndpointRow
                path="/api/diagnostics/explain"
                purpose="Classify Fiber failure messages."
                consumer="support, wallets"
              />
              <EndpointRow
                path="/api/reachability/summary"
                purpose="Latest reachability probe summary."
                consumer="operators"
              />
              <EndpointRow
                path="/api/export/graph.json"
                purpose="Normalized public graph JSON."
                consumer="research, monitoring"
              />
              <EndpointRow
                path="/api/export/nodes.csv"
                purpose="Node CSV export."
                consumer="analysis"
              />
              <EndpointRow
                path="/api/export/channels.csv"
                purpose="Channel CSV export."
                consumer="analysis"
              />
              <EndpointRow
                path="/api/openapi.json"
                purpose="OpenAPI contract."
                consumer="client generation"
              />
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

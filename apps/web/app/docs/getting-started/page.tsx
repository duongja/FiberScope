import { apiUrl } from "../../../lib/api";
import { AmountNote, CurlBlock, DocsHeader } from "../_shared";

export default function GettingStartedDocsPage() {
  return (
    <>
      <DocsHeader
        title="Getting started"
        description="Confirm the API is reachable, learn the amount format, and run your first read-only requests."
      />

      <section className="grid cols-2">
        <div className="card">
          <h2>1. Check service health</h2>
          <p className="muted">
            Use this in deployment checks and uptime monitors. It returns
            whether the API can read indexed graph counts.
          </p>
          <CurlBlock>{`curl -sS ${apiUrl("/health")}`}</CurlBlock>
        </div>
        <div className="card">
          <h2>2. Read the network summary</h2>
          <p className="muted">
            Use this for dashboard totals: public nodes, channels, capacity by
            asset, reachability, and latest snapshot time.
          </p>
          <CurlBlock>{`curl -sS ${apiUrl("/api/network/summary")}`}</CurlBlock>
        </div>
      </section>

      <section className="grid cols-2 docs-section">
        <div className="card">
          <h2>3. List assets</h2>
          <p className="muted">
            Use this before showing an asset selector or checking multi-asset
            route support.
          </p>
          <CurlBlock>{`curl -sS ${apiUrl("/api/assets")}`}</CurlBlock>
        </div>
        <div className="card">
          <h2>4. List nodes</h2>
          <p className="muted">
            Use this to find node pubkeys for route and diagnostic tests.
          </p>
          <CurlBlock>{`curl -sS "${apiUrl("/api/nodes?limit=5")}"`}</CurlBlock>
        </div>
      </section>

      <section className="docs-section">
        <AmountNote />
      </section>
    </>
  );
}

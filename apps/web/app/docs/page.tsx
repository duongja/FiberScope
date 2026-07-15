import { apiUrl } from "../../lib/api";
import { CopyableCode } from "../../components/copyable-code";
import { DocsHeader, DocsNav } from "./_shared";

export default function DocsPage() {
  return (
    <>
      <DocsHeader
        title="FiberScope API docs"
        description="Focused, copy-pasteable HTTP API guides for Fiber route readiness, diagnostics, liquidity, and graph exports."
      />

      <section className="docs-hero-grid">
        <div className="card docs-intro-card">
          <h2>What this API is for</h2>
          <p>
            FiberScope is a read-only intelligence layer for Fiber Network. It
            indexes public graph data, exposes route and receive readiness, and
            translates common payment failures into practical next steps.
          </p>
          <div className="docs-token-list">
            <span>HTTP API</span>
            <span>Public graph only</span>
            <span>Copy-paste examples</span>
            <span>OpenAPI contract</span>
          </div>
        </div>
        <div className="card docs-base-card">
          <h2>Base URL</h2>
          <CopyableCode code={apiUrl("")} />
          <p className="muted">
            Use the HTTP API directly or generate a client from the OpenAPI
            contract.
          </p>
        </div>
      </section>

      <section className="docs-section">
        <div className="section-head">
          <div>
            <h2>Start here</h2>
            <p>
              Each section is short and task-based. Use the real test values to
              verify the deployed API and UI.
            </p>
          </div>
        </div>
        <DocsNav />
      </section>
    </>
  );
}

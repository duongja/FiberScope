import { apiUrl } from "../../../lib/api";
import { CurlBlock, DocsHeader } from "../_shared";

export default function ExportsDocsPage() {
  return (
    <>
      <DocsHeader
        title="Exports"
        description="Download normalized public graph data or fetch the OpenAPI contract for generated clients."
      />

      <section className="grid cols-2">
        <div className="card">
          <h2>Graph JSON</h2>
          <p className="muted">
            Normalized public graph data for dashboards, notebooks, and
            monitoring tools.
          </p>
          <CurlBlock>{`curl -sS ${apiUrl("/api/export/graph.json")}`}</CurlBlock>
        </div>
        <div className="card">
          <h2>OpenAPI</h2>
          <p className="muted">
            Use this contract to generate a client or validate integrations.
          </p>
          <CurlBlock>{`curl -sS ${apiUrl("/api/openapi.json")}`}</CurlBlock>
        </div>
      </section>

      <section className="card docs-section">
        <h2>CSV exports</h2>
        <div className="toolbar docs-export-actions">
          <a
            className="button secondary"
            href={apiUrl("/api/export/nodes.csv")}
          >
            nodes.csv
          </a>
          <a
            className="button secondary"
            href={apiUrl("/api/export/channels.csv")}
          >
            channels.csv
          </a>
        </div>
      </section>
    </>
  );
}

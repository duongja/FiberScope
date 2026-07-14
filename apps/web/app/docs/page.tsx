import { apiUrl } from "../../lib/api";

export default function DocsPage() {
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Wallet integration API</h1>
          <p>
            Use FiberScope as a read-only intelligence layer before attempting
            Fiber channel or payment actions.
          </p>
        </div>
      </div>

      <section className="grid cols-2">
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Can this wallet pay?</h2>
          <p className="muted">
            Checks public graph route readiness for a source, target, asset, and
            amount.
          </p>
          <pre>{`GET ${apiUrl("/api/readiness/can-pay")}
  ?source_pubkey=...
  &target_pubkey=...
  &asset=CKB
  &amount=100000000`}</pre>
        </div>
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Can this wallet receive?</h2>
          <p className="muted">
            Checks whether public inbound directions appear available for the
            receiver.
          </p>
          <pre>{`GET ${apiUrl("/api/readiness/can-receive")}
  ?target_pubkey=...
  &asset=CKB
  &amount=100000000`}</pre>
        </div>
      </section>

      <section className="grid cols-2" style={{ marginTop: 16 }}>
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Recommended peers</h2>
          <p className="muted">
            Find public nodes that look useful for channel opening or wallet
            bootstrap flows.
          </p>
          <pre>{`GET ${apiUrl("/api/liquidity/recommendations")}
  ?asset=CKB
  &amount=100000000`}</pre>
        </div>
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Explain a failure</h2>
          <p className="muted">
            Classify common Fiber failure messages into wallet-friendly
            guidance.
          </p>
          <pre>{`GET ${apiUrl("/api/diagnostics/explain")}
  ?message=no%20route%20found`}</pre>
        </div>
      </section>

      <section className="grid cols-2" style={{ marginTop: 16 }}>
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Graph exports</h2>
          <p className="muted">
            Download normalized public graph data for dashboards, research, and
            wallet tooling.
          </p>
          <div
            className="toolbar"
            style={{ flexWrap: "wrap", marginBottom: 0 }}
          >
            <a
              className="button secondary"
              href={apiUrl("/api/export/graph.json")}
            >
              graph.json
            </a>
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
        </div>
        <div className="card">
          <h2 style={{ marginTop: 0 }}>OpenAPI</h2>
          <p className="muted">
            Use the API description as the contract for generated clients or
            integration tests.
          </p>
          <pre>{`GET ${apiUrl("/api/openapi.json")}`}</pre>
        </div>
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <h2 style={{ marginTop: 0 }}>SDK example</h2>
        <pre>{`import { FiberScopeClient } from "@fiberscope/sdk";

const scope = new FiberScopeClient({ baseUrl: "${apiUrl("")}" });
const readiness = await scope.canPay({
  sourcePubkey: "...",
  targetPubkey: "...",
  asset: "CKB",
  amount: "100000000",
});

const graph = await scope.graphExport();`}</pre>
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <h2 style={{ marginTop: 0 }}>Privacy boundary</h2>
        <p>
          FiberScope only indexes public graph announcements and optional CKB
          funding evidence. It does not index private invoices, private
          payments, private channel balances, or private payment paths.
          Authenticated operator mode can be added later for a node owner’s own
          data.
        </p>
      </section>
    </>
  );
}

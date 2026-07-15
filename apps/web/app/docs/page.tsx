import { apiUrl } from "../../lib/api";

const sourcePubkey =
  "0313d0a1c4d2b028da68905f9088531f3ea7db5139788bbb681ccc7b17fdf8b6df";
const directTargetPubkey =
  "0313dcf9cf18711b1b473a78ea56222dc44dcbfdf559d24dd937a0657d3bcb108f";
const multiHopTargetPubkey =
  "0349fdc5ae3fd050831a89b544cceeb2e8c6e1d6ecfc1e4f0cdb689be263b02d5a";
const failedTargetPubkey =
  "032c9c03ec4235e52f08ee46a508de3ce310ad7ee32f39b46507137db2d6a6456f";

export default function DocsPage() {
  return (
    <>
      <div className="page-head">
        <div>
          <h1>FiberScope API docs</h1>
          <p>
            Read-only Fiber Network intelligence for wallets, merchants, node
            operators, and diagnostics tooling.
          </p>
        </div>
        <a className="button secondary" href={apiUrl("/api/openapi.json")}>
          OpenAPI JSON
        </a>
      </div>

      <section className="docs-hero-grid">
        <div className="card docs-intro-card">
          <h2>Integration model</h2>
          <p>
            FiberScope indexes public Fiber graph data, enriches it with CKB
            funding evidence when available, and exposes route readiness,
            receive readiness, liquidity recommendations, diagnostics, and graph
            exports through a simple HTTP API.
          </p>
          <div className="docs-token-list">
            <span>Public graph only</span>
            <span>No private payments</span>
            <span>Wallet-ready responses</span>
            <span>OpenAPI contract</span>
          </div>
        </div>
        <div className="card docs-base-card">
          <h2>Base URL</h2>
          <pre>{apiUrl("")}</pre>
          <p className="muted">
            All examples below use the configured frontend API base. Amounts are
            raw smallest units. For CKB, <code>100000000</code> equals{" "}
            <code>1 CKB</code>.
          </p>
        </div>
      </section>

      <section className="card docs-section">
        <div className="section-head">
          <div>
            <h2>Endpoint catalog</h2>
            <p>
              Use these endpoints directly or through the typed SDK. Every
              endpoint is read-only.
            </p>
          </div>
        </div>
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
                purpose="Current node, channel, capacity, reachability, and freshness summary."
                consumer="dashboards"
              />
              <EndpointRow
                path="/api/assets"
                purpose="Indexed CKB and UDT assets."
                consumer="wallet asset pickers"
              />
              <EndpointRow
                path="/api/nodes"
                purpose="Search public Fiber nodes by pubkey or node name."
                consumer="explorers, wallets"
              />
              <EndpointRow
                path="/api/channels"
                purpose="Search public channels with asset, direction, and CKB evidence fields."
                consumer="explorers, operators"
              />
              <EndpointRow
                path="/api/routes/estimate"
                purpose="Estimate public route readiness for a source, target, asset, and amount."
                consumer="wallets"
              />
              <EndpointRow
                path="/api/readiness/can-pay"
                purpose="Wallet-friendly alias for route readiness."
                consumer="wallet send flows"
              />
              <EndpointRow
                path="/api/readiness/can-receive"
                purpose="Estimate whether a receiver has usable public inbound capacity."
                consumer="wallet receive flows"
              />
              <EndpointRow
                path="/api/liquidity/recommendations"
                purpose="Rank public peers for channel opening and wallet bootstrap."
                consumer="wallets, LSP tooling"
              />
              <EndpointRow
                path="/api/diagnostics/explain"
                purpose="Classify failure messages and optionally run a route check."
                consumer="support, wallets"
              />
              <EndpointRow
                path="/api/export/graph.json"
                purpose="Download normalized public graph data."
                consumer="research, monitoring"
              />
            </tbody>
          </table>
        </div>
      </section>

      <section className="docs-section">
        <div className="section-head">
          <div>
            <h2>Route readiness examples</h2>
            <p>
              These values were tested against the live FiberScope API and are
              useful for checking both positive and negative flows.
            </p>
          </div>
        </div>

        <div className="grid cols-3">
          <ExampleCard
            title="Direct successful route"
            badge="can pay"
            tone="green"
            description="Expected result: canPay true, about 88% confidence, 1 hop."
            code={`GET ${apiUrl("/api/routes/estimate")}
  ?source_pubkey=${sourcePubkey}
  &target_pubkey=${directTargetPubkey}
  &asset=CKB
  &amount=100000000`}
          />
          <ExampleCard
            title="Multi-hop successful route"
            badge="can pay"
            tone="green"
            description="Expected result: canPay true, lower confidence, around 4 hops."
            code={`GET ${apiUrl("/api/routes/estimate")}
  ?source_pubkey=${sourcePubkey}
  &target_pubkey=${multiHopTargetPubkey}
  &asset=CKB
  &amount=100000000`}
          />
          <ExampleCard
            title="Failed route"
            badge="cannot pay"
            tone="red"
            description="Expected result: canPay false with a no-route warning."
            code={`GET ${apiUrl("/api/routes/estimate")}
  ?source_pubkey=${sourcePubkey}
  &target_pubkey=${failedTargetPubkey}
  &asset=CKB
  &amount=100000000`}
          />
        </div>
      </section>

      <section className="grid cols-2 docs-section">
        <div className="card">
          <h2>Can this wallet pay?</h2>
          <p className="muted">
            Use this before a wallet attempts a payment. It returns the same
            public route estimate shape as <code>/api/routes/estimate</code>.
          </p>
          <pre>{`GET ${apiUrl("/api/readiness/can-pay")}
  ?source_pubkey=${sourcePubkey}
  &target_pubkey=${directTargetPubkey}
  &asset=CKB
  &amount=100000000`}</pre>
        </div>
        <div className="card">
          <h2>Can this wallet receive?</h2>
          <p className="muted">
            Use this before showing a user that receiving is likely ready. It
            checks public inbound channel direction and capacity signals.
          </p>
          <pre>{`GET ${apiUrl("/api/readiness/can-receive")}
  ?target_pubkey=${directTargetPubkey}
  &asset=CKB
  &amount=100000000`}</pre>
        </div>
      </section>

      <section className="card docs-section">
        <div className="section-head">
          <div>
            <h2>Payment diagnostics examples</h2>
            <p>
              Diagnostics accepts a failure message and optional payment
              context. If source, target, and amount are supplied, FiberScope
              also runs a route estimate alongside the failure classification.
            </p>
          </div>
        </div>

        <div className="docs-example-stack">
          <DiagnosticExample
            title="No route with failed route check"
            expected="Expected category: no_route. Route check: route not ready."
            body={`{
  "message": "no route found",
  "code": "ROUTE_NOT_FOUND",
  "source_pubkey": "${sourcePubkey}",
  "target_pubkey": "${failedTargetPubkey}",
  "asset": "CKB",
  "amount": "100000000"
}`}
          />
          <DiagnosticExample
            title="Failure text, but route now looks usable"
            expected="Expected category: no_route. Route check: route likely usable, about 88%, 1 hop."
            body={`{
  "message": "payment failed with no route found",
  "code": "TEMPORARY_CHANNEL_FAILURE",
  "source_pubkey": "${sourcePubkey}",
  "target_pubkey": "${directTargetPubkey}",
  "asset": "CKB",
  "amount": "100000000"
}`}
          />
          <DiagnosticExample
            title="Insufficient liquidity"
            expected="Expected category: insufficient_liquidity."
            body={`{
  "message": "insufficient liquidity in channel capacity",
  "code": "INSUFFICIENT_LIQUIDITY",
  "asset": "CKB",
  "amount": "1000000000000000"
}`}
          />
          <DiagnosticExample
            title="Invoice expired"
            expected="Expected category: invoice_expired."
            body={`{
  "message": "invoice expired before payment completed",
  "code": "INVOICE_EXPIRED",
  "asset": "CKB",
  "amount": "100000000"
}`}
          />
          <DiagnosticExample
            title="Asset mismatch"
            expected="Expected category: asset_mismatch."
            body={`{
  "message": "unsupported UDT asset mismatch",
  "code": "ASSET_MISMATCH",
  "asset": "RUSD",
  "amount": "1000000"
}`}
          />
          <DiagnosticExample
            title="Connectivity"
            expected="Expected category: connectivity."
            body={`{
  "message": "peer connection failed while connecting to node",
  "code": "PEER_CONNECT_FAILED",
  "asset": "CKB",
  "amount": "100000000"
}`}
          />
        </div>
      </section>

      <section className="grid cols-2 docs-section">
        <div className="card">
          <h2>Recommended peers</h2>
          <p className="muted">
            Find public nodes that look useful for channel opening or wallet
            bootstrap flows.
          </p>
          <pre>{`GET ${apiUrl("/api/liquidity/recommendations")}
  ?asset=CKB
  &amount=100000000`}</pre>
        </div>
        <div className="card">
          <h2>Graph exports</h2>
          <p className="muted">
            Download normalized public graph data for dashboards, research, and
            wallet tooling.
          </p>
          <div className="toolbar docs-export-actions">
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
      </section>

      <section className="card docs-section">
        <h2>SDK example</h2>
        <pre>{`import { FiberScopeClient } from "@fiberscope/sdk";

const scope = new FiberScopeClient({ baseUrl: "${apiUrl("")}" });

const readiness = await scope.canPay({
  sourcePubkey: "${sourcePubkey}",
  targetPubkey: "${directTargetPubkey}",
  asset: "CKB",
  amount: "100000000",
});

const graph = await scope.graphExport();`}</pre>
      </section>

      <section className="card docs-section">
        <h2>Privacy boundary</h2>
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

function EndpointRow({
  path,
  purpose,
  consumer,
}: {
  path: string;
  purpose: string;
  consumer: string;
}) {
  return (
    <tr>
      <td className="mono">{path}</td>
      <td>{purpose}</td>
      <td>{consumer}</td>
    </tr>
  );
}

function ExampleCard({
  title,
  badge,
  tone,
  description,
  code,
}: {
  title: string;
  badge: string;
  tone: "green" | "red";
  description: string;
  code: string;
}) {
  return (
    <div className="card docs-example-card">
      <div className="docs-example-head">
        <h3>{title}</h3>
        <span className={`badge ${tone}`}>{badge}</span>
      </div>
      <p className="muted">{description}</p>
      <pre>{code}</pre>
    </div>
  );
}

function DiagnosticExample({
  title,
  expected,
  body,
}: {
  title: string;
  expected: string;
  body: string;
}) {
  return (
    <div className="docs-diagnostic-example">
      <div>
        <h3>{title}</h3>
        <p className="muted">{expected}</p>
      </div>
      <pre>{`POST ${apiUrl("/api/diagnostics/explain")}
Content-Type: application/json

${body}`}</pre>
    </div>
  );
}

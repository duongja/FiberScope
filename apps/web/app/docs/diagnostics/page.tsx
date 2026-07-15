import {
  DocsHeader,
  DiagnosticExample,
  directTargetPubkey,
  failedTargetPubkey,
  sourcePubkey,
} from "../_shared";

export default function DiagnosticsDocsPage() {
  return (
    <>
      <DocsHeader
        title="Diagnostics"
        description="Classify payment failure messages and optionally attach source, target, asset, and amount for a route check."
      />

      <section className="card">
        <h2>How diagnostics works</h2>
        <p>
          Send a failure message and optional context to{" "}
          <code>POST /api/diagnostics/explain</code>. FiberScope returns a
          category, explanation, recommended actions, and a route estimate when
          source, target, and amount are supplied.
        </p>
      </section>

      <section className="card docs-section">
        <div className="docs-example-stack">
          <DiagnosticExample
            title="No route with failed route check"
            expected="Expected category: no_route. Route check: route not ready."
            body={`{"message":"no route found","code":"ROUTE_NOT_FOUND","source_pubkey":"${sourcePubkey}","target_pubkey":"${failedTargetPubkey}","asset":"CKB","amount":"100000000"}`}
          />
          <DiagnosticExample
            title="Failure text, but route now looks usable"
            expected="Expected category: no_route. Route check: route likely usable, about 88%, 1 hop."
            body={`{"message":"payment failed with no route found","code":"TEMPORARY_CHANNEL_FAILURE","source_pubkey":"${sourcePubkey}","target_pubkey":"${directTargetPubkey}","asset":"CKB","amount":"100000000"}`}
          />
          <DiagnosticExample
            title="Insufficient liquidity"
            expected="Expected category: insufficient_liquidity."
            body={`{"message":"insufficient liquidity in channel capacity","code":"INSUFFICIENT_LIQUIDITY","asset":"CKB","amount":"1000000000000000"}`}
          />
          <DiagnosticExample
            title="Invoice expired"
            expected="Expected category: invoice_expired."
            body={`{"message":"invoice expired before payment completed","code":"INVOICE_EXPIRED","asset":"CKB","amount":"100000000"}`}
          />
          <DiagnosticExample
            title="Asset mismatch"
            expected="Expected category: asset_mismatch."
            body={`{"message":"unsupported UDT asset mismatch","code":"ASSET_MISMATCH","asset":"RUSD","amount":"1000000"}`}
          />
          <DiagnosticExample
            title="Connectivity"
            expected="Expected category: connectivity."
            body={`{"message":"peer connection failed while connecting to node","code":"PEER_CONNECT_FAILED","asset":"CKB","amount":"100000000"}`}
          />
        </div>
      </section>
    </>
  );
}

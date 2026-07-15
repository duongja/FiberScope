import { apiUrl } from "../../../lib/api";
import {
  AmountNote,
  DocsHeader,
  ExampleCard,
  directTargetPubkey,
  failedTargetPubkey,
  multiHopTargetPubkey,
  sourcePubkey,
} from "../_shared";

export default function RoutesDocsPage() {
  return (
    <>
      <DocsHeader
        title="Routes"
        description="Estimate whether a payment can route through the indexed public Fiber graph."
      />

      <section className="docs-section">
        <AmountNote />
      </section>

      <section className="docs-example-stack docs-section">
        <ExampleCard
          title="Direct successful route"
          badge="can pay"
          tone="green"
          description="Expected result: canPay true, about 88% confidence, 1 hop."
          code={`curl -sS "${apiUrl("/api/routes/estimate")}?source_pubkey=${sourcePubkey}&target_pubkey=${directTargetPubkey}&asset=CKB&amount=100000000"`}
        />
        <ExampleCard
          title="Multi-hop successful route"
          badge="can pay"
          tone="green"
          description="Expected result: canPay true, lower confidence, around 4 hops."
          code={`curl -sS "${apiUrl("/api/routes/estimate")}?source_pubkey=${sourcePubkey}&target_pubkey=${multiHopTargetPubkey}&asset=CKB&amount=100000000"`}
        />
        <ExampleCard
          title="Failed route"
          badge="cannot pay"
          tone="red"
          description="Expected result: canPay false with a no-route warning."
          code={`curl -sS "${apiUrl("/api/routes/estimate")}?source_pubkey=${sourcePubkey}&target_pubkey=${failedTargetPubkey}&asset=CKB&amount=100000000"`}
        />
      </section>

      <section className="card docs-section">
        <h2>Response fields to read first</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Field</th>
                <th>Meaning</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="mono">canPay</td>
                <td>Whether a public enabled route was found.</td>
              </tr>
              <tr>
                <td className="mono">confidence</td>
                <td>Public graph confidence from 0 to 1.</td>
              </tr>
              <tr>
                <td className="mono">hopCount</td>
                <td>Number of public channel hops in the selected route.</td>
              </tr>
              <tr>
                <td className="mono">estimatedFee</td>
                <td>Estimated fee in the same smallest unit as the asset.</td>
              </tr>
              <tr>
                <td className="mono">warnings</td>
                <td>Reasons confidence may be low or routing may fail.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

import { apiUrl } from "../../../lib/api";
import {
  AmountNote,
  CurlBlock,
  DocsHeader,
  directTargetPubkey,
  sourcePubkey,
} from "../_shared";

export default function ReadinessDocsPage() {
  return (
    <>
      <DocsHeader
        title="Readiness and liquidity"
        description="Use these endpoints in wallet send, receive, and channel-opening flows."
      />

      <section className="docs-section">
        <AmountNote />
      </section>

      <section className="grid cols-2 docs-section">
        <div className="card">
          <h2>Can this wallet pay?</h2>
          <p className="muted">
            Alias for route readiness. Use it before attempting a payment.
          </p>
          <CurlBlock>{`curl -sS "${apiUrl("/api/readiness/can-pay")}?source_pubkey=${sourcePubkey}&target_pubkey=${directTargetPubkey}&asset=CKB&amount=100000000"`}</CurlBlock>
        </div>
        <div className="card">
          <h2>Can this wallet receive?</h2>
          <p className="muted">
            Checks whether public inbound directions appear available for a
            receiver.
          </p>
          <CurlBlock>{`curl -sS "${apiUrl("/api/readiness/can-receive")}?target_pubkey=${directTargetPubkey}&asset=CKB&amount=100000000"`}</CurlBlock>
        </div>
      </section>

      <section className="card docs-section">
        <h2>Recommended peers</h2>
        <p className="muted">
          Use this when a wallet or service needs public peer candidates for
          channel opening or bootstrap.
        </p>
        <CurlBlock>{`curl -sS "${apiUrl("/api/liquidity/recommendations")}?asset=CKB&amount=100000000"`}</CurlBlock>
      </section>
    </>
  );
}

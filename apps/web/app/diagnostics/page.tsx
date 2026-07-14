import { apiGet } from "../../lib/api";
import { DiagnosticsForm } from "./diagnostics-form";

interface NodesResponse {
  nodes: Array<{ pubkey: string }>;
}

export default async function DiagnosticsPage() {
  const { nodes } = await apiGet<NodesResponse>("/api/nodes?limit=2");

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Payment diagnostics</h1>
          <p>
            Translate low-level Fiber payment failures into wallet-friendly categories and recovery actions. Add
            source, target, asset, and amount to include a public route check.
          </p>
        </div>
        <span className="badge orange">public graph context</span>
      </div>
      <DiagnosticsForm defaultSource={nodes[0]?.pubkey} defaultTarget={nodes[1]?.pubkey} />
    </>
  );
}

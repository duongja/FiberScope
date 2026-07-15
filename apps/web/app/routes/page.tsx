import { apiGet } from "../../lib/api";
import { RouteForm } from "./route-form";

interface NodesResponse {
  nodes: Array<{ pubkey: string }>;
}

export default async function RoutesPage() {
  const { nodes } = await apiGet<NodesResponse>("/api/nodes?limit=2");

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Route simulator</h1>
          <p>
            Estimate whether a payment can route through the public graph. This
            is not a payment guarantee.
          </p>
        </div>
        <span className="badge orange">Estimate only</span>
      </div>
      <RouteForm
        defaultSource={nodes[0]?.pubkey}
        defaultTarget={nodes[1]?.pubkey}
      />
    </>
  );
}

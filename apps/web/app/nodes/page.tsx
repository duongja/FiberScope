import { NodeDirectory, type NodeRecord } from "../../components/node-sections";
import { apiGet } from "../../lib/api";

interface NodesResponse {
  nodes: NodeRecord[];
}

export default async function NodesPage() {
  const { nodes } = await apiGet<NodesResponse>("/api/nodes?limit=100");

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Public Fiber nodes</h1>
          <p>Compare announced nodes by freshness, connectivity, channel-readiness hints, and routing usefulness.</p>
        </div>
      </div>
      <NodeDirectory nodes={nodes} />
    </>
  );
}

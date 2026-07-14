import { apiGet } from "../../lib/api";

interface SourcesResponse {
  sources: Array<{
    id: string;
    name: string;
    url: string;
    network: string;
    lastPollAt?: string | null;
    lastError?: string | null;
    snapshots: Array<{
      id: string;
      status: string;
      nodeCount: number;
      channelCount: number;
      error?: string | null;
      startedAt: string;
      completedAt?: string | null;
    }>;
  }>;
}

interface HistoryResponse {
  snapshots: Array<{
    id: string;
    sourceName: string;
    sourceUrl: string;
    status: string;
    nodeCount: number;
    channelCount: number;
    error?: string | null;
    startedAt: string;
    completedAt?: string | null;
  }>;
}

export default async function ObservabilityPage() {
  const [sources, history] = await Promise.all([
    apiGet<SourcesResponse>("/api/ingestion/sources"),
    apiGet<HistoryResponse>("/api/network/history?limit=25"),
  ]);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Graph observability</h1>
          <p>Monitor Fiber graph ingestion sources, snapshot freshness, and indexer errors.</p>
        </div>
      </div>

      <section className="grid cols-2">
        {sources.sources.map((source) => (
          <div className="card" key={source.id}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div>
                <h2 style={{ marginTop: 0 }}>{source.name}</h2>
                <p className="mono muted">{source.url}</p>
              </div>
              <span className={`badge ${source.lastError ? "red" : "green"}`}>
                {source.lastError ? "error" : "healthy"}
              </span>
            </div>
            <p className="muted">Network: {source.network}</p>
            <p className="muted">Last poll: {source.lastPollAt ? new Date(source.lastPollAt).toLocaleString() : "never"}</p>
            {source.lastError ? <p className="muted">{source.lastError}</p> : null}
          </div>
        ))}
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <h2 style={{ marginTop: 0 }}>Recent graph snapshots</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Source</th>
                <th>Status</th>
                <th>Nodes</th>
                <th>Channels</th>
                <th>Started</th>
                <th>Error</th>
              </tr>
            </thead>
            <tbody>
              {history.snapshots.map((snapshot) => (
                <tr key={snapshot.id}>
                  <td>{snapshot.sourceName}</td>
                  <td>
                    <span className={`badge ${snapshot.status === "COMPLETED" ? "green" : snapshot.status === "FAILED" ? "red" : "orange"}`}>
                      {snapshot.status.toLowerCase()}
                    </span>
                  </td>
                  <td>{snapshot.nodeCount}</td>
                  <td>{snapshot.channelCount}</td>
                  <td>{new Date(snapshot.startedAt).toLocaleString()}</td>
                  <td className="muted">{snapshot.error ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

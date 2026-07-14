"use client";

import { useState } from "react";
import { apiUrl, truncateMiddle } from "../../lib/api";

interface DiagnosticResponse {
  category: string;
  explanation: string;
  recommendedActions: string[];
  suppliedContext: {
    sourcePubkey: string | null;
    targetPubkey: string | null;
    asset: string;
    amount: string | null;
  };
  routeEstimate: null | {
    canPay: boolean;
    confidence: number;
    estimatedFee: string;
    hopCount: number;
    warnings: string[];
    recommendedActions: string[];
    route: Array<{
      channelOutpoint: string;
      fromPubkey: string;
      toPubkey: string;
      fee: string;
    }>;
  };
}

export function DiagnosticsForm({
  defaultSource,
  defaultTarget,
}: {
  defaultSource?: string;
  defaultTarget?: string;
}) {
  const [message, setMessage] = useState("no route found");
  const [code, setCode] = useState("");
  const [source, setSource] = useState(defaultSource ?? "");
  const [target, setTarget] = useState(defaultTarget ?? "");
  const [asset, setAsset] = useState("CKB");
  const [amount, setAmount] = useState("100000000");
  const [result, setResult] = useState<DiagnosticResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch(apiUrl("/api/diagnostics/explain"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message,
          code,
          source_pubkey: source || undefined,
          target_pubkey: target || undefined,
          asset,
          amount: amount || undefined,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Diagnostic request failed");
      }
      setResult(payload as DiagnosticResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid" style={{ gap: 16 }}>
      <form className="card" onSubmit={submit}>
        <div className="form-grid">
          <label style={{ gridColumn: "1 / -1" }}>
            <div className="metric-label">Failure message</div>
            <textarea
              className="input"
              rows={4}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              required
              style={{ resize: "vertical" }}
            />
          </label>
          <label>
            <div className="metric-label">Failure code</div>
            <input className="input mono" value={code} onChange={(event) => setCode(event.target.value)} />
          </label>
          <label>
            <div className="metric-label">Asset</div>
            <input className="input" value={asset} onChange={(event) => setAsset(event.target.value)} />
          </label>
          <label>
            <div className="metric-label">Source pubkey</div>
            <input className="input mono" value={source} onChange={(event) => setSource(event.target.value)} />
          </label>
          <label>
            <div className="metric-label">Target pubkey</div>
            <input className="input mono" value={target} onChange={(event) => setTarget(event.target.value)} />
          </label>
          <label>
            <div className="metric-label">Amount in smallest unit</div>
            <input className="input mono" value={amount} onChange={(event) => setAmount(event.target.value)} />
          </label>
        </div>
        <button className="button" style={{ marginTop: 14 }} disabled={loading} type="submit">
          {loading ? "Diagnosing..." : "Explain failure"}
        </button>
      </form>

      {error ? <div className="callout">{error}</div> : null}

      {result ? (
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <div>
              <h2 style={{ marginTop: 0 }}>{result.category.replaceAll("_", " ")}</h2>
              <p className="muted">{result.explanation}</p>
            </div>
            <span className="badge orange">diagnostic</span>
          </div>

          <div className="grid cols-2" style={{ marginTop: 14 }}>
            <div>
              <h3>Recommended actions</h3>
              {result.recommendedActions.map((action) => (
                <p className="muted" key={action}>{action}</p>
              ))}
            </div>
            <div>
              <h3>Context</h3>
              <p className="muted">Asset: {result.suppliedContext.asset}</p>
              <p className="muted">Amount: {result.suppliedContext.amount ?? "not supplied"}</p>
            </div>
          </div>

          {result.routeEstimate ? (
            <div className="card" style={{ marginTop: 14, boxShadow: "none" }}>
              <h3 style={{ marginTop: 0 }}>Route check</h3>
              <p>
                <span className={`badge ${result.routeEstimate.canPay ? "green" : "red"}`}>
                  {result.routeEstimate.canPay ? "route likely usable" : "route not ready"}
                </span>
              </p>
              <p className="muted">
                Confidence {Math.round(result.routeEstimate.confidence * 100)}% · {result.routeEstimate.hopCount} hops ·
                estimated fee {result.routeEstimate.estimatedFee}
              </p>
              {result.routeEstimate.route.length ? (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Hop</th>
                        <th>Channel</th>
                        <th>Direction</th>
                        <th>Fee</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.routeEstimate.route.map((hop, index) => (
                        <tr key={`${hop.channelOutpoint}-${index}`}>
                          <td>{index + 1}</td>
                          <td className="mono">{truncateMiddle(hop.channelOutpoint)}</td>
                          <td className="mono">
                            {truncateMiddle(hop.fromPubkey, 8, 4)} → {truncateMiddle(hop.toPubkey, 8, 4)}
                          </td>
                          <td>{hop.fee}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
              {result.routeEstimate.warnings.map((warning) => (
                <p className="muted" key={warning}>{warning}</p>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

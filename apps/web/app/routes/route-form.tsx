"use client";

import { useState } from "react";
import { apiUrl, truncateMiddle } from "../../lib/api";

interface Estimate {
  canPay: boolean;
  confidence: number;
  asset: string;
  amount: string;
  estimatedFee: string;
  hopCount: number;
  route: Array<{
    channelOutpoint: string;
    fromPubkey: string;
    toPubkey: string;
    fee: string;
    warnings: string[];
  }>;
  warnings: string[];
  recommendedActions: string[];
}

export function RouteForm({ defaultSource, defaultTarget }: { defaultSource?: string; defaultTarget?: string }) {
  const [source, setSource] = useState(defaultSource ?? "");
  const [target, setTarget] = useState(defaultTarget ?? "");
  const [asset, setAsset] = useState("CKB");
  const [amount, setAmount] = useState("100000000");
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setEstimate(null);
    const params = new URLSearchParams({
      source_pubkey: source,
      target_pubkey: target,
      asset,
      amount,
    });
    try {
      const response = await fetch(apiUrl(`/api/routes/estimate?${params.toString()}`));
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Route estimate failed");
      }
      setEstimate(payload as Estimate);
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
          <label>
            <div className="metric-label">Source pubkey</div>
            <input className="input mono" value={source} onChange={(event) => setSource(event.target.value)} required />
          </label>
          <label>
            <div className="metric-label">Target pubkey</div>
            <input className="input mono" value={target} onChange={(event) => setTarget(event.target.value)} required />
          </label>
          <label>
            <div className="metric-label">Asset</div>
            <input className="input" value={asset} onChange={(event) => setAsset(event.target.value)} />
          </label>
          <label>
            <div className="metric-label">Amount in smallest unit</div>
            <input className="input mono" value={amount} onChange={(event) => setAmount(event.target.value)} required />
          </label>
        </div>
        <button className="button" style={{ marginTop: 14 }} disabled={loading} type="submit">
          {loading ? "Estimating..." : "Estimate route"}
        </button>
      </form>

      {error ? <div className="callout">{error}</div> : null}

      {estimate ? (
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <div>
              <h2 style={{ marginTop: 0 }}>{estimate.canPay ? "Route likely usable" : "Route not ready"}</h2>
              <p className="muted">Confidence {Math.round(estimate.confidence * 100)}% · {estimate.hopCount} hops · estimated fee {estimate.estimatedFee}</p>
            </div>
            <span className={`badge ${estimate.canPay ? "green" : "red"}`}>{estimate.canPay ? "can pay" : "cannot pay"}</span>
          </div>

          {estimate.route.length > 0 ? (
            <div className="table-wrap" style={{ marginTop: 12 }}>
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
                  {estimate.route.map((hop, index) => (
                    <tr key={`${hop.channelOutpoint}-${index}`}>
                      <td>{index + 1}</td>
                      <td className="mono">{truncateMiddle(hop.channelOutpoint)}</td>
                      <td className="mono">{truncateMiddle(hop.fromPubkey, 8, 4)} → {truncateMiddle(hop.toPubkey, 8, 4)}</td>
                      <td>{hop.fee}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          <div className="grid cols-2" style={{ marginTop: 14 }}>
            <div>
              <h3>Warnings</h3>
              {estimate.warnings.length ? estimate.warnings.map((warning) => <p className="muted" key={warning}>{warning}</p>) : <p className="muted">No public-graph warnings.</p>}
            </div>
            <div>
              <h3>Recommended actions</h3>
              {estimate.recommendedActions.map((action) => <p className="muted" key={action}>{action}</p>)}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

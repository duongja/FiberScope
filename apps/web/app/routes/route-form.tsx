"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  GitBranch,
  Loader2,
  Route,
  ShieldQuestion,
} from "lucide-react";
import { apiUrl, formatCkb, truncateMiddle } from "../../lib/api";

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

export function RouteForm({
  defaultSource,
  defaultTarget,
}: {
  defaultSource?: string;
  defaultTarget?: string;
}) {
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
      const response = await fetch(
        apiUrl(`/api/routes/estimate?${params.toString()}`),
      );
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
    <div className="route-workbench">
      <section className="route-query-card card">
        <div className="section-head">
          <div>
            <h2>Payment constraints</h2>
            <p>
              Enter the sender node, receiver node, asset, and raw amount to
              test against the indexed public graph.
            </p>
          </div>
          <span className="badge orange">public graph</span>
        </div>

        <form onSubmit={submit}>
          <div className="form-grid route-form-grid">
            <label>
              <div className="metric-label">Source pubkey</div>
              <input
                className="input mono"
                value={source}
                onChange={(event) => setSource(event.target.value)}
                required
              />
            </label>
            <label>
              <div className="metric-label">Target pubkey</div>
              <input
                className="input mono"
                value={target}
                onChange={(event) => setTarget(event.target.value)}
                required
              />
            </label>
            <label>
              <div className="metric-label">Asset</div>
              <input
                className="input"
                value={asset}
                onChange={(event) => setAsset(event.target.value)}
              />
            </label>
            <label>
              <div className="metric-label">Amount in smallest unit</div>
              <input
                className="input mono"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                required
              />
            </label>
          </div>

          <div className="route-submit-row">
            <button className="button" disabled={loading} type="submit">
              {loading ? (
                <>
                  <Loader2 size={17} aria-hidden="true" />
                  Estimating...
                </>
              ) : (
                <>
                  <Route size={17} aria-hidden="true" />
                  Estimate route
                </>
              )}
            </button>
            <span className="muted">
              Amounts are raw smallest units. For CKB, 100000000 = 1 CKB.
            </span>
          </div>
        </form>
      </section>

      <aside className="route-guide-panel">
        <div className="card route-guide-card">
          <h2>How to use it</h2>
          <ol className="route-guide-list">
            <li>Choose a source Fiber node pubkey.</li>
            <li>Choose a target Fiber node pubkey.</li>
            <li>Set the asset symbol or id, usually CKB.</li>
            <li>Enter the raw payment amount and run the estimate.</li>
          </ol>
        </div>
        <div className="card route-guide-card">
          <h2>How to read it</h2>
          <div className="route-readout-list">
            <span>
              <CheckCircle2 size={15} aria-hidden="true" />
              Can pay means a public enabled path was found.
            </span>
            <span>
              <ShieldQuestion size={15} aria-hidden="true" />
              Confidence drops when liquidity is hidden or graph data is stale.
            </span>
            <span>
              <AlertTriangle size={15} aria-hidden="true" />
              This does not prove private balance or invoice success.
            </span>
          </div>
        </div>
      </aside>

      <section className="route-result-column">
        {error ? (
          <div className="callout route-error">
            <AlertTriangle size={18} aria-hidden="true" />
            <div>
              <strong>Route estimate failed</strong>
              <p>{error}</p>
            </div>
          </div>
        ) : null}

        {estimate ? (
          <div className="route-result-card card">
            <div className="route-result-head">
              <div>
                <div className="route-kicker">
                  <GitBranch size={16} aria-hidden="true" />
                  Route estimate
                </div>
                <h2>
                  {estimate.canPay ? "Route likely usable" : "Route not ready"}
                </h2>
                <p className="muted">
                  {displayAsset(estimate.asset)} ·{" "}
                  {formatAmount(estimate.amount, estimate.asset)}
                </p>
              </div>
              <span className={`badge ${estimate.canPay ? "green" : "red"}`}>
                {estimate.canPay ? "can pay" : "cannot pay"}
              </span>
            </div>

            <div className="route-score-grid">
              <RouteMetric
                label="Confidence"
                value={`${Math.round(estimate.confidence * 100)}%`}
                detail={
                  estimate.canPay ? "public route signal" : "not routeable"
                }
              />
              <RouteMetric
                label="Hops"
                value={estimate.hopCount}
                detail={estimate.hopCount === 1 ? "direct path" : "public path"}
              />
              <RouteMetric
                label="Estimated fee"
                value={formatAmount(estimate.estimatedFee, estimate.asset)}
                detail="public graph fee"
              />
            </div>

            <div className="route-confidence">
              <div className="route-confidence-head">
                <span>Confidence</span>
                <strong>{Math.round(estimate.confidence * 100)}%</strong>
              </div>
              <div className="score-track">
                <div
                  className="score-fill"
                  style={{ width: `${Math.round(estimate.confidence * 100)}%` }}
                />
              </div>
            </div>

            {estimate.route.length > 0 ? (
              <div className="route-path">
                <div className="section-head compact">
                  <div>
                    <h3>Public path</h3>
                    <p>
                      {estimate.route.length} hop route returned by the
                      estimator.
                    </p>
                  </div>
                </div>
                <div className="route-hop-list">
                  {estimate.route.map((hop, index) => (
                    <div
                      className="route-hop"
                      key={`${hop.channelOutpoint}-${index}`}
                    >
                      <div className="route-hop-index">{index + 1}</div>
                      <div className="route-hop-main">
                        <strong className="mono">
                          {truncateMiddle(hop.channelOutpoint)}
                        </strong>
                        <span className="mono">
                          {truncateMiddle(hop.fromPubkey, 8, 4)} →{" "}
                          {truncateMiddle(hop.toPubkey, 8, 4)}
                        </span>
                        {hop.warnings.length ? (
                          <div className="route-hop-warnings">
                            {hop.warnings.map((warning) => (
                              <span key={warning}>{warning}</span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                      <div className="route-hop-fee">
                        <span>Fee</span>
                        <strong>{formatAmount(hop.fee, estimate.asset)}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="route-empty-path">
                <CircleDot size={18} aria-hidden="true" />
                No public path was returned for this estimate.
              </div>
            )}

            <div className="route-advice-grid">
              <AdvicePanel
                title="Warnings"
                items={
                  estimate.warnings.length
                    ? estimate.warnings
                    : ["No public-graph warnings."]
                }
                tone={estimate.warnings.length ? "orange" : "green"}
              />
              <AdvicePanel
                title="Recommended actions"
                items={estimate.recommendedActions}
                tone="blue"
              />
            </div>
          </div>
        ) : (
          <div className="route-empty-state card">
            <Route size={26} aria-hidden="true" />
            <h2>Ready to estimate</h2>
            <p>
              Run a route estimate to see confidence, fee, hop count, warnings,
              and the public path the graph can currently support.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function RouteMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <div className="route-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function AdvicePanel({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "blue" | "green" | "orange";
}) {
  return (
    <div className={`route-advice ${tone}`}>
      <h3>{title}</h3>
      {items.map((item) => (
        <p key={item}>{item}</p>
      ))}
    </div>
  );
}

function displayAsset(value: string): string {
  return value === "ckb" ? "CKB" : value;
}

function formatAmount(value: string, asset: string): string {
  return asset === "ckb" ? formatCkb(value) : value;
}

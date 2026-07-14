export function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail?: string;
}) {
  return (
    <div className="card">
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      {detail ? <div className="muted" style={{ marginTop: 8, fontSize: 13 }}>{detail}</div> : null}
    </div>
  );
}

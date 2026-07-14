export function StatusBadge({ enabled, label }: { enabled: boolean; label?: string }) {
  return <span className={`badge ${enabled ? "green" : "red"}`}>{label ?? (enabled ? "enabled" : "disabled")}</span>;
}

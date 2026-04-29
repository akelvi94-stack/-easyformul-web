import { formatNumber } from "../../lib/utils";

export function MetricCard({ label, value, caption }) {
  return (
    <article className="metric-card">
      <p>{label}</p>
      <strong>{typeof value === "number" ? formatNumber(value, { maximumFractionDigits: 0 }) : value}</strong>
      {caption ? <span>{caption}</span> : null}
    </article>
  );
}

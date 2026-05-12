type AdminMetricCardProps = {
  label: string;
  value: number | string;
  detail?: string;
};

export function AdminMetricCard({ label, value, detail }: AdminMetricCardProps) {
  return (
    <article className="card admin-metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? <p>{detail}</p> : null}
    </article>
  );
}

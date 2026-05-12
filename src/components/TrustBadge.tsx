type TrustBadgeProps = {
  label: string;
  detail: string;
};

export function TrustBadge({ label, detail }: TrustBadgeProps) {
  return (
    <div className="trust-badge">
      <span aria-hidden="true">✓</span>
      <div>
        <strong>{label}</strong>
        <p>{detail}</p>
      </div>
    </div>
  );
}

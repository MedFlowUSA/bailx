type AgencyCardProps = {
  name: string;
  counties: string;
  status: string;
};

export function AgencyCard({ name, counties, status }: AgencyCardProps) {
  return (
    <article className="card agency-card">
      <div>
        <p className="eyebrow">Licensed provider</p>
        <h3>{name}</h3>
        <p>{counties}</p>
      </div>
      <span className="status-pill">{status}</span>
    </article>
  );
}

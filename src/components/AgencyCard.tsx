type AgencyCardProps = {
  name: string;
  counties: string;
  status: string;
  documentCount?: number;
  languages?: string;
  collateral?: string;
  offerCount?: number;
};

export function AgencyCard({
  name,
  counties,
  status,
  documentCount,
  languages,
  collateral,
  offerCount,
}: AgencyCardProps) {
  return (
    <article className="card agency-card">
      <div>
        <p className="eyebrow">Marketplace provider</p>
        <h3>{name}</h3>
        <p>{counties}</p>
        <div className="badge-row" aria-label="Agency marketplace trust signals">
          <span className="soft-badge">Review status: {status}</span>
          {documentCount !== undefined ? (
            <span className="soft-badge">Documents submitted: {documentCount}</span>
          ) : null}
          {languages ? <span className="soft-badge">Languages: {languages}</span> : null}
          {collateral ? <span className="soft-badge">Collateral: {collateral}</span> : null}
          {offerCount !== undefined ? (
            <span className="soft-badge">Offers submitted: {offerCount}</span>
          ) : null}
        </div>
        <p className="compliance-note">
          Marketplace trust signals are based on information submitted to BailX
          and internal platform review. BailX does not guarantee provider
          licensing status, pricing, release timing, or service outcome.
        </p>
      </div>
      <span className="status-pill">{status}</span>
    </article>
  );
}

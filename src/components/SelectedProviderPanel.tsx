import type { AgencyOffer } from "../types";

type SelectedProviderPanelProps = {
  offer: AgencyOffer;
};

function formatMoney(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "Confirm with provider";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function SelectedProviderPanel({ offer }: SelectedProviderPanelProps) {
  const agencyName = offer.agencies?.business_name || "Selected provider";
  const agencyPhone = offer.agencies?.phone;
  const agencyEmail = offer.agencies?.email;

  async function copyContactInfo() {
    const contact = [
      agencyName,
      agencyPhone ? `Phone: ${agencyPhone}` : null,
      agencyEmail ? `Email: ${agencyEmail}` : null,
      `Down payment: ${formatMoney(offer.down_payment)}`,
      offer.estimated_release_time ? `Release timing: ${offer.estimated_release_time}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    if (navigator.clipboard) {
      await navigator.clipboard.writeText(contact);
    }
  }

  return (
    <section className="card selected-provider-panel">
      <div>
        <p className="eyebrow">Selected provider</p>
        <h2>{agencyName}</h2>
        <p>Contact the provider directly to confirm all final terms and timing.</p>
      </div>
      <dl className="agency-detail-grid">
        <div>
          <dt>Down payment</dt>
          <dd>{formatMoney(offer.down_payment)}</dd>
        </div>
        <div>
          <dt>Estimated release</dt>
          <dd>{offer.estimated_release_time || "Confirm with provider"}</dd>
        </div>
        <div>
          <dt>Financing</dt>
          <dd>{offer.financing_available ? "Available" : "Confirm with provider"}</dd>
        </div>
        <div>
          <dt>Collateral</dt>
          <dd>{offer.collateral_notes || "Confirm with provider"}</dd>
        </div>
      </dl>
      <div className="offer-actions">
        {agencyPhone ? (
          <a className="button primary" href={`tel:${agencyPhone}`}>
            Call Provider
          </a>
        ) : null}
        {agencyEmail ? (
          <a className="button secondary" href={`mailto:${agencyEmail}`}>
            Email Provider
          </a>
        ) : null}
        {agencyPhone || agencyEmail ? (
          <button className="button secondary" type="button" onClick={copyContactInfo}>
            Copy Contact Info
          </button>
        ) : null}
      </div>
      <p className="compliance-note">
        BailX does not issue bonds, set provider terms, or guarantee release outcomes.
        Confirm all terms directly with the licensed provider.
      </p>
    </section>
  );
}

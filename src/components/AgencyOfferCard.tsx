import type { AgencyOffer } from "../types";

type AgencyOfferCardProps =
  | {
      offer: AgencyOffer;
      disabled?: boolean;
      isSelecting?: boolean;
      onSelect?: (offer: AgencyOffer) => void;
      agency?: never;
      premium?: never;
      response?: never;
    }
  | {
      offer?: never;
      agency: string;
      premium: string;
      response: string;
    };

function formatMoney(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "Not listed";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function AgencyOfferCard(props: AgencyOfferCardProps) {
  if (!props.offer) {
    return (
      <article className="card offer-card">
        <div>
          <h3>{props.agency}</h3>
          <p>{props.response}</p>
        </div>
        <strong>{props.premium}</strong>
        <button className="button secondary" type="button">
          Review Offer
        </button>
      </article>
    );
  }

  const { offer } = props;
  const agencyName = offer.agencies?.business_name || "Licensed provider";
  const agencyPhone = offer.agencies?.phone;
  const agencyEmail = offer.agencies?.email;
  const isSelected = offer.status === "selected";
  const showProviderContact = Boolean(isSelected && (agencyPhone || agencyEmail));
  const canSelect = Boolean(props.onSelect) && !props.disabled && !isSelected;

  async function copyContactInfo() {
    const contact = [
      agencyName,
      agencyPhone ? `Phone: ${agencyPhone}` : null,
      agencyEmail ? `Email: ${agencyEmail}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    if (navigator.clipboard) {
      await navigator.clipboard.writeText(contact);
    }
  }

  return (
    <article className={`card comparison-offer-card${isSelected ? " selected-offer" : ""}`}>
      <div>
        <p className="eyebrow">{isSelected ? "Selected provider" : offer.status}</p>
        <h3>{agencyName}</h3>
        <p>{offer.message || "Provider did not add a message yet."}</p>
      </div>
      <div className="offer-highlight-row">
        <div>
          <span>Down payment</span>
          <strong>{formatMoney(offer.down_payment)}</strong>
        </div>
        <div>
          <span>Estimated release</span>
          <strong>{offer.estimated_release_time || "Confirm timing"}</strong>
        </div>
      </div>
      <dl className="agency-detail-grid">
        <div>
          <dt>Down payment</dt>
          <dd>{formatMoney(offer.down_payment)}</dd>
        </div>
        <div>
          <dt>Release timing</dt>
          <dd>{offer.estimated_release_time || "Confirm with provider"}</dd>
        </div>
        <div>
          <dt>Financing</dt>
          <dd>{offer.financing_available ? "Financing available" : "Confirm with provider"}</dd>
        </div>
        <div>
          <dt>Collateral</dt>
          <dd>{offer.collateral_notes || "Confirm with provider"}</dd>
        </div>
      </dl>
      {showProviderContact ? (
        <div className="provider-contact">
          {agencyPhone ? <a href={`tel:${agencyPhone}`}>Call: {agencyPhone}</a> : null}
          {agencyEmail ? <a href={`mailto:${agencyEmail}`}>Email: {agencyEmail}</a> : null}
        </div>
      ) : null}
      <p className="compliance-note">
        Review this offer carefully and confirm all terms directly with the provider.
      </p>
      <div className="offer-actions">
        {showProviderContact && agencyPhone ? (
          <a className="button secondary" href={`tel:${agencyPhone}`}>
            Call Provider
          </a>
        ) : null}
        {showProviderContact && agencyEmail ? (
          <a className="button secondary" href={`mailto:${agencyEmail}`}>
            Email Provider
          </a>
        ) : null}
        {showProviderContact ? (
          <button className="button secondary" type="button" onClick={copyContactInfo}>
            Copy Contact Info
          </button>
        ) : null}
        {props.onSelect ? (
          <button
            className="button primary"
            type="button"
            disabled={!canSelect || props.isSelecting}
            onClick={() => props.onSelect?.(offer)}
          >
            {isSelected ? "Provider Selected" : props.isSelecting ? "Selecting..." : "Select Provider"}
          </button>
        ) : null}
      </div>
    </article>
  );
}

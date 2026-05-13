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

function getOfferBadges(offer: AgencyOffer) {
  const badges: string[] = [];

  if (offer.financing_available) {
    badges.push("Financing available");
  }

  if (offer.collateral_notes) {
    badges.push("Collateral flexible");
  }

  if (offer.estimated_release_time) {
    badges.push("Fast estimate provided");
  }

  if (
    offer.down_payment !== null &&
    offer.down_payment !== undefined &&
    offer.estimated_release_time &&
    offer.collateral_notes &&
    offer.message
  ) {
    badges.push("Complete offer");
  }

  return badges;
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
  const isDeclined = offer.status === "declined";
  const showProviderContact = Boolean(isSelected && (agencyPhone || agencyEmail));
  const canSelect = Boolean(props.onSelect) && !props.disabled && !isSelected;
  const badges = getOfferBadges(offer);

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
    <article
      className={`card comparison-offer-card${isSelected ? " selected-offer" : ""}${
        isDeclined ? " declined-offer" : ""
      }`}
    >
      <div>
        <p className="eyebrow">{isSelected ? "Selected provider" : offer.status}</p>
        <h3>{agencyName}</h3>
        <p>{offer.message || "Provider did not add a message yet."}</p>
      </div>
      {badges.length > 0 ? (
        <div className="badge-row" aria-label="Offer trust signals">
          {badges.map((badge) => (
            <span className="soft-badge" key={badge}>
              {badge}
            </span>
          ))}
        </div>
      ) : null}
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
          <dt>Collateral notes</dt>
          <dd>{offer.collateral_notes || "Confirm with provider"}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{offer.status}</dd>
        </div>
        <div>
          <dt>Created</dt>
          <dd>{new Date(offer.created_at).toLocaleString()}</dd>
        </div>
        <div>
          <dt>Selection state</dt>
          <dd>{isSelected ? "Selected by consumer" : isDeclined ? "Declined after selection" : "Open"}</dd>
        </div>
        <div className="agency-review-notes">
          <dt>Provider message</dt>
          <dd>{offer.message || "No message supplied."}</dd>
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

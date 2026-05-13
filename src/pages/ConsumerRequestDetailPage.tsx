import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AgencyOfferCard } from "../components/AgencyOfferCard";
import { CustomerNextSteps } from "../components/CustomerNextSteps";
import { ProviderQuestions } from "../components/ProviderQuestions";
import { RequestStatusTimeline } from "../components/RequestStatusTimeline";
import { SelectedProviderPanel } from "../components/SelectedProviderPanel";
import { getOffersForBailRequest, selectAgencyOffer } from "../lib/agencyOffers";
import { getBailRequestById } from "../lib/consumerRequests";
import { getRequestStatusLabel } from "../lib/requestStatus";
import type { AgencyOffer, BailRequest } from "../types";

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

const providerChoiceGuidance = [
  "Confirm the total amount due today.",
  "Ask whether the premium is refundable or non-refundable.",
  "Ask what collateral is required.",
  "Ask whether financing includes fees or interest.",
  "Ask who the main point of contact is.",
  "Ask what happens if the defendant misses court.",
  "Ask for all terms in writing.",
];

export function ConsumerRequestDetailPage() {
  const { id } = useParams();
  const [bailRequest, setBailRequest] = useState<BailRequest | null>(null);
  const [offers, setOffers] = useState<AgencyOffer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectingOfferId, setSelectingOfferId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const selectedOffer = offers.find((offer) => offer.status === "selected");

  async function loadRequestAndOffers() {
    if (!id) {
      setErrorMessage("Missing request id.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setStatusMessage(null);

    const requestResult = await getBailRequestById(id);

    if (!requestResult.ok) {
      setIsLoading(false);
      setErrorMessage(requestResult.error);
      return;
    }

    if (!requestResult.bailRequest) {
      setIsLoading(false);
      setBailRequest(null);
      setOffers([]);
      return;
    }

    const offersResult = await getOffersForBailRequest(id);
    setIsLoading(false);

    if (!offersResult.ok) {
      setErrorMessage(offersResult.error);
      return;
    }

    setBailRequest(requestResult.bailRequest);
    setOffers(offersResult.offers);
    setStatusMessage(
      requestResult.mocked || offersResult.mocked
        ? "Showing mock comparison data until Supabase is configured."
        : null,
    );
  }

  useEffect(() => {
    void loadRequestAndOffers();
  }, [id]);

  async function handleSelectOffer(offer: AgencyOffer) {
    if (!bailRequest || selectedOffer) {
      return;
    }

    setSelectingOfferId(offer.id);
    setErrorMessage(null);
    setStatusMessage(null);

    const result = await selectAgencyOffer(offer.id, bailRequest.id);
    setSelectingOfferId(null);

    if (!result.ok) {
      setErrorMessage(result.error);
      return;
    }

    await loadRequestAndOffers();
    setStatusMessage(result.message);
  }

  return (
    <section className="page-section">
      <div className="page-heading-row">
        <div>
          <p className="eyebrow">Consumer request</p>
          <h1>Request Command Center</h1>
          <p>
            Review each offer carefully and confirm all terms directly with the provider.
          </p>
        </div>
        <Link className="button secondary" to="/consumer/dashboard">
          Back to Requests
        </Link>
      </div>

      {isLoading ? <p>Loading request and offers...</p> : null}
      {statusMessage ? <p className="form-message success">{statusMessage}</p> : null}
      {errorMessage ? <p className="form-message error">{errorMessage}</p> : null}

      {bailRequest ? (
        <article className="card request-summary-card">
          <div>
            <p className="eyebrow">Request status: {getRequestStatusLabel(bailRequest.status)}</p>
            <h2>{bailRequest.defendant_name || "Defendant not listed"}</h2>
            <p>
              {bailRequest.jail_location || "Jail not listed"} |{" "}
              {bailRequest.jail_county || "County not listed"}
            </p>
          </div>
          <strong>{formatMoney(bailRequest.bond_amount)}</strong>
        </article>
      ) : !isLoading ? (
        <p>No request found.</p>
      ) : null}

      {selectedOffer ? <SelectedProviderPanel offer={selectedOffer} /> : null}

      {bailRequest ? (
        <section className="section-grid customer-detail-grid">
          <article className="card">
            <p className="eyebrow">Request overview</p>
            <h2>Current status</h2>
            <RequestStatusTimeline status={bailRequest.status} />
          </article>
          <article className="card">
            <p className="eyebrow">Defendant and jail</p>
            <h2>{bailRequest.defendant_name || "Defendant not listed"}</h2>
            <dl className="agency-detail-grid">
              <div>
                <dt>Jail</dt>
                <dd>{bailRequest.jail_location || "Not listed"}</dd>
              </div>
              <div>
                <dt>County</dt>
                <dd>{bailRequest.jail_county || "Not listed"}</dd>
              </div>
              <div>
                <dt>City / State</dt>
                <dd>
                  {[bailRequest.jail_city, bailRequest.jail_state].filter(Boolean).join(", ") ||
                    "Not listed"}
                </dd>
              </div>
              <div>
                <dt>Language</dt>
                <dd>{bailRequest.preferred_language || "Not listed"}</dd>
              </div>
            </dl>
          </article>
          <article className="card">
            <p className="eyebrow">Bail and bond</p>
            <h2>{formatMoney(bailRequest.bond_amount)}</h2>
            <dl className="agency-detail-grid">
              <div>
                <dt>Charges</dt>
                <dd>{bailRequest.charges || "Not listed"}</dd>
              </div>
              <div>
                <dt>Collateral available</dt>
                <dd>{bailRequest.collateral_available?.join(", ") || "Not listed"}</dd>
              </div>
              <div>
                <dt>Urgency</dt>
                <dd>{bailRequest.urgency_level}</dd>
              </div>
              <div>
                <dt>Submitted</dt>
                <dd>{new Date(bailRequest.created_at).toLocaleDateString()}</dd>
              </div>
            </dl>
          </article>
          <article className="card activity-log">
            <p className="eyebrow">Activity</p>
            <h2>Request timeline</h2>
            <ul>
              <li>Your request has been submitted.</li>
              <li>Approved providers may review your request and submit offers.</li>
              {offers.length > 0 ? <li>Offers are available for review.</li> : null}
              {selectedOffer ? <li>Provider selected. Contact them directly for next steps.</li> : null}
            </ul>
          </article>
          <article className="card guidance-card">
            <p className="eyebrow">Before you choose</p>
            <h2>Provider questions</h2>
            <ul className="question-list">
              {providerChoiceGuidance.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </section>
      ) : null}

      {bailRequest ? (
        <section className="card">
          <p className="eyebrow">Agency offers</p>
          <h2>Compare provider responses</h2>
          <p>
            BailX does not issue bonds or guarantee release outcomes. Confirm
            pricing, collateral, documents, and timing directly with each provider.
          </p>
          <div className="offer-comparison-grid">
            {!isLoading && offers.length === 0 ? (
              <p>No offers have been submitted yet.</p>
            ) : null}
            {offers.map((offer) => (
              <AgencyOfferCard
                key={offer.id}
                offer={offer}
                disabled={Boolean(selectedOffer)}
                isSelecting={selectingOfferId === offer.id}
                onSelect={handleSelectOffer}
              />
            ))}
          </div>
        </section>
      ) : null}

      {bailRequest ? (
        <div className="section-grid customer-guidance-grid">
          <CustomerNextSteps />
          <ProviderQuestions />
        </div>
      ) : null}

      <p className="compliance-note">
        BailX is a technology marketplace and advertising platform. BailX does not
        provide legal advice, issue bail bonds, set provider terms, or guarantee
        release outcomes.
      </p>
    </section>
  );
}

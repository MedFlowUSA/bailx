import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AgencyOfferCard } from "../components/AgencyOfferCard";
import { RequestStatusTimeline } from "../components/RequestStatusTimeline";
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
          <h1>Compare Agency Offers</h1>
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

      <p className="compliance-note">
        BailX does not guarantee pricing, approval, release timing, or service
        outcomes. Consumers should confirm all terms directly with the licensed provider.
      </p>

      {bailRequest ? <RequestStatusTimeline status={bailRequest.status} /> : null}

      {bailRequest ? (
        <section className="card activity-log">
          <p className="eyebrow">Activity</p>
          <h2>Request timeline</h2>
          <ul>
            <li>Request submitted {new Date(bailRequest.created_at).toLocaleDateString()}</li>
            {offers.length > 0 ? <li>Offer received from licensed provider</li> : null}
            {selectedOffer ? <li>Provider selected</li> : null}
          </ul>
        </section>
      ) : null}

      <div className="offer-comparison-grid">
        {!isLoading && offers.length === 0 ? <p>No offers have been submitted yet.</p> : null}
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
  );
}

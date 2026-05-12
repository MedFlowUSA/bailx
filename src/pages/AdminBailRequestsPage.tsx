import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { RequestStatusTimeline } from "../components/RequestStatusTimeline";
import {
  getOfferCountsForBailRequests,
  getSelectedOffersForBailRequests,
} from "../lib/agencyOffers";
import { getRecentBailRequests } from "../lib/adminBailRequests";
import { getRequestStatusLabel } from "../lib/requestStatus";
import type { AgencyOffer, BailRequest } from "../types";

function formatMoney(value: number | null) {
  if (value === null) {
    return "Not listed";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function AdminBailRequestsPage() {
  const [bailRequests, setBailRequests] = useState<BailRequest[]>([]);
  const [offerCounts, setOfferCounts] = useState<Record<string, number>>({});
  const [selectedOffers, setSelectedOffers] = useState<Record<string, AgencyOffer>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function loadBailRequests() {
    setIsLoading(true);
    setErrorMessage(null);

    const result = await getRecentBailRequests();
    setIsLoading(false);

    if (!result.ok) {
      setErrorMessage(result.error);
      return;
    }

    setBailRequests(result.bailRequests);
    setStatusMessage(
      result.mocked ? "Showing mock bail requests until Supabase is configured." : null,
    );

    const countsResult = await getOfferCountsForBailRequests(
      result.bailRequests.map((request) => request.id),
    );

    if (countsResult.ok) {
      setOfferCounts(countsResult.counts);
    }

    const selectedResult = await getSelectedOffersForBailRequests(
      result.bailRequests.map((request) => request.id),
    );

    if (selectedResult.ok) {
      setSelectedOffers(selectedResult.selectedOffers);
    }
  }

  useEffect(() => {
    void loadBailRequests();
  }, []);

  return (
    <section className="page-section">
      <div className="page-heading-row">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>Bail Requests</h1>
        </div>
        <button className="button secondary" type="button" onClick={loadBailRequests}>
          Refresh
        </button>
      </div>
      <div className="table-card">
        {isLoading ? <p>Loading bail requests...</p> : null}
        {statusMessage ? <p className="form-message success">{statusMessage}</p> : null}
        {errorMessage ? <p className="form-message error">{errorMessage}</p> : null}
        {!isLoading && bailRequests.length === 0 ? <p>No bail requests found.</p> : null}

        <div className="request-row header-row">
          <span>Requester</span>
          <span>Location</span>
          <span>Bond</span>
          <span>Status / Offers</span>
        </div>
        {bailRequests.map((request) => (
          <div className="request-row" key={request.id}>
            <span>
              <strong>{request.requester_name || "Unknown requester"}</strong>
              <small>{request.defendant_name || "No defendant listed"}</small>
            </span>
            <span>{request.jail_location || "Not listed"}</span>
            <span>{formatMoney(request.bond_amount)}</span>
            <span>
              <span
                className={
                  request.status === "provider_selected" ||
                  request.urgency_level === "critical" ||
                  request.urgency_level === "urgent"
                    ? "status-pill urgent"
                    : "status-pill"
                }
              >
                {getRequestStatusLabel(request.status)}
              </span>
              <small>{offerCounts[request.id] || 0} offers</small>
              <RequestStatusTimeline status={request.status} compact />
              {selectedOffers[request.id] ? (
                <small>
                  Selected:{" "}
                  {selectedOffers[request.id].agencies?.business_name || "Licensed provider"} (
                  {selectedOffers[request.id].status})
                </small>
              ) : null}
              <Link className="button secondary" to={`/consumer/requests/${request.id}`}>
                View Offers
              </Link>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

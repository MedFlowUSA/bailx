import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { RequestStatusTimeline } from "../components/RequestStatusTimeline";
import {
  getOfferCountsForBailRequests,
  getSelectedOffersForBailRequests,
} from "../lib/agencyOffers";
import { getRequestStatusLabel } from "../lib/requestStatus";
import { getRecentConsumerBailRequests } from "../lib/consumerRequests";
import type { AgencyOffer, BailRequest } from "../types";

const activeStatuses = new Set(["submitted", "providers_notified", "offers_received", "provider_selected"]);

export function ConsumerDashboardPage() {
  const [bailRequests, setBailRequests] = useState<BailRequest[]>([]);
  const [offerCounts, setOfferCounts] = useState<Record<string, number>>({});
  const [selectedOffers, setSelectedOffers] = useState<Record<string, AgencyOffer>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function loadRequests() {
    setIsLoading(true);
    setErrorMessage(null);

    const result = await getRecentConsumerBailRequests();
    setIsLoading(false);

    if (!result.ok) {
      setErrorMessage(result.error);
      return;
    }

    setBailRequests(result.bailRequests);
    setStatusMessage(
      result.mocked ? "Showing mock requests until Supabase is configured." : null,
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
    void loadRequests();
  }, []);

  const summary = {
    active: bailRequests.filter((request) => activeStatuses.has(request.status)).length,
    offers: Object.values(offerCounts).reduce((total, count) => total + count, 0),
    selected: bailRequests.filter((request) => request.status === "provider_selected").length,
    closed: bailRequests.filter((request) => ["closed", "cancelled"].includes(request.status)).length,
  };

  return (
    <section className="page-section">
      <div className="page-heading-row">
        <div>
          <p className="eyebrow">Consumer dashboard</p>
          <h1>Request Command Center</h1>
          <p>
            Your request has been submitted. Approved providers may review your
            request and submit offers.
          </p>
        </div>
        <div className="hero-actions">
          <Link className="button primary" to="/get-help-now">
            Submit New Request
          </Link>
          <button className="button secondary" type="button" onClick={loadRequests}>
            Refresh
          </button>
        </div>
      </div>

      <div className="summary-grid">
        <article className="card summary-card">
          <span>Active requests</span>
          <strong>{summary.active}</strong>
        </article>
        <article className="card summary-card">
          <span>Offers received</span>
          <strong>{summary.offers}</strong>
        </article>
        <article className="card summary-card">
          <span>Provider selected</span>
          <strong>{summary.selected}</strong>
        </article>
        <article className="card summary-card">
          <span>Closed requests</span>
          <strong>{summary.closed}</strong>
        </article>
      </div>

      <div className="dashboard-grid">
        {isLoading ? <p>Loading requests...</p> : null}
        {statusMessage ? <p className="form-message success">{statusMessage}</p> : null}
        {errorMessage ? <p className="form-message error">{errorMessage}</p> : null}
        {!isLoading && bailRequests.length === 0 ? (
          <article className="card empty-state-card">
            <h2>No active requests yet</h2>
            <p>
              Submit an emergency bail request to start provider review. Anonymous
              intake is available, but signed-in customers can track requests here.
            </p>
            <Link className="button primary" to="/get-help-now">
              Start Emergency Request
            </Link>
          </article>
        ) : null}
        {bailRequests.map((request) => (
          <article className="card request-portal-card" key={request.id}>
            <div className="request-card-header">
              <div>
                <p className="eyebrow">{getRequestStatusLabel(request.status)}</p>
                <h2>{request.defendant_name || "Defendant not listed"}</h2>
                <p>
                  {request.jail_location || "Jail not listed"} |{" "}
                  {request.jail_county || "County not listed"}
                </p>
              </div>
              <span className="status-pill">{offerCounts[request.id] || 0} offers</span>
            </div>
            <RequestStatusTimeline status={request.status} compact />
            {selectedOffers[request.id] ? (
              <p className="form-message success">
                Selected provider:{" "}
                {selectedOffers[request.id].agencies?.business_name || "Licensed provider"}
              </p>
            ) : (
              <p>Review each offer carefully and confirm all terms directly with the provider.</p>
            )}
            <Link className="button primary" to={`/consumer/requests/${request.id}`}>
              View Offers & Details
            </Link>
          </article>
        ))}
      </div>
      <p className="compliance-note">
        BailX does not issue bonds, provide legal advice, or guarantee release outcomes.
      </p>
    </section>
  );
}

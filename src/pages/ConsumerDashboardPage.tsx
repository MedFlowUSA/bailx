import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { RequestStatusTimeline } from "../components/RequestStatusTimeline";
import { getOfferCountsForBailRequests } from "../lib/agencyOffers";
import { getRequestStatusLabel } from "../lib/requestStatus";
import { getRecentConsumerBailRequests } from "../lib/consumerRequests";
import type { BailRequest } from "../types";

export function ConsumerDashboardPage() {
  const [bailRequests, setBailRequests] = useState<BailRequest[]>([]);
  const [offerCounts, setOfferCounts] = useState<Record<string, number>>({});
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
  }

  useEffect(() => {
    void loadRequests();
  }, []);

  return (
    <section className="page-section">
      <div className="page-heading-row">
        <div>
          <p className="eyebrow">Consumer dashboard</p>
          <h1>Your BailX Requests</h1>
        </div>
        <button className="button secondary" type="button" onClick={loadRequests}>
          Refresh
        </button>
      </div>
      <div className="dashboard-grid">
        {isLoading ? <p>Loading requests...</p> : null}
        {statusMessage ? <p className="form-message success">{statusMessage}</p> : null}
        {errorMessage ? <p className="form-message error">{errorMessage}</p> : null}
        {!isLoading && bailRequests.length === 0 ? <p>No requests found.</p> : null}
        {bailRequests.map((request) => (
          <article className="card" key={request.id}>
            <p className="eyebrow">{getRequestStatusLabel(request.status)}</p>
            <h2>{request.defendant_name || "Defendant not listed"}</h2>
            <p>
              {request.jail_location || "Jail not listed"} |{" "}
              {request.jail_county || "County not listed"}
            </p>
            <p>{offerCounts[request.id] || 0} offers submitted</p>
            <RequestStatusTimeline status={request.status} compact />
            <Link className="button primary" to={`/consumer/requests/${request.id}`}>
              View Offers
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

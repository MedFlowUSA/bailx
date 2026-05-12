import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { RequestStatusTimeline } from "../components/RequestStatusTimeline";
import {
  getOfferCountsForBailRequests,
  getSelectedOffersForBailRequests,
} from "../lib/agencyOffers";
import { getRecentAdminBailRequests } from "../lib/adminDashboard";
import { getRequestStatusLabel } from "../lib/requestStatus";
import type { AgencyOffer, BailRequest } from "../types";

type RequestFilter = "all" | "submitted" | "offers_received" | "provider_selected" | "closed";

const filters: { label: string; value: RequestFilter }[] = [
  { label: "All", value: "all" },
  { label: "Submitted", value: "submitted" },
  { label: "Offers received", value: "offers_received" },
  { label: "Provider selected", value: "provider_selected" },
  { label: "Closed", value: "closed" },
];

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

export function AdminBailRequestsPage() {
  const [bailRequests, setBailRequests] = useState<BailRequest[]>([]);
  const [offerCounts, setOfferCounts] = useState<Record<string, number>>({});
  const [selectedOffers, setSelectedOffers] = useState<Record<string, AgencyOffer>>({});
  const [filter, setFilter] = useState<RequestFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function loadBailRequests() {
    setIsLoading(true);
    setErrorMessage(null);

    const result = await getRecentAdminBailRequests(75);
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

  const filteredRequests = bailRequests.filter((request) => {
    if (filter === "all") {
      return true;
    }

    if (filter === "closed") {
      return request.status === "closed" || request.status === "cancelled";
    }

    return request.status === filter;
  });

  return (
    <section className="page-section">
      <div className="page-heading-row">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>Bail Requests</h1>
          <p>Audit requester details, jail information, provider activity, and selected outcomes.</p>
        </div>
        <button className="button secondary" type="button" onClick={loadBailRequests}>
          Refresh
        </button>
      </div>

      <div className="filter-row" role="group" aria-label="Filter bail requests">
        {filters.map((item) => (
          <button
            className={`filter-button${filter === item.value ? " active" : ""}`}
            key={item.value}
            type="button"
            onClick={() => setFilter(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {isLoading ? <p>Loading bail requests...</p> : null}
      {statusMessage ? <p className="form-message success">{statusMessage}</p> : null}
      {errorMessage ? <p className="form-message error">{errorMessage}</p> : null}
      {!isLoading && filteredRequests.length === 0 ? <p>No bail requests found.</p> : null}

      <div className="admin-card-list">
        {filteredRequests.map((request) => (
          <article className="card admin-request-card" key={request.id}>
            <div className="request-card-header">
              <div>
                <p className="eyebrow">Created {new Date(request.created_at).toLocaleDateString()}</p>
                <h2>{request.defendant_name || "Defendant not listed"}</h2>
                <p>{request.requester_name || "Unknown requester"}</p>
              </div>
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
            </div>

            <dl className="agency-detail-grid">
              <div>
                <dt>Requester contact</dt>
                <dd>
                  {[request.requester_phone, request.requester_email].filter(Boolean).join(" | ") ||
                    "Not listed"}
                </dd>
              </div>
              <div>
                <dt>Jail</dt>
                <dd>{request.jail_location || "Not listed"}</dd>
              </div>
              <div>
                <dt>City / county / state</dt>
                <dd>
                  {[request.jail_city, request.jail_county, request.jail_state]
                    .filter(Boolean)
                    .join(", ") || "Not listed"}
                </dd>
              </div>
              <div>
                <dt>Bond amount</dt>
                <dd>{formatMoney(request.bond_amount)}</dd>
              </div>
              <div>
                <dt>Urgency</dt>
                <dd>{request.urgency_level}</dd>
              </div>
              <div>
                <dt>Offers</dt>
                <dd>{offerCounts[request.id] || 0} submitted</dd>
              </div>
              <div>
                <dt>Selected provider</dt>
                <dd>
                  {selectedOffers[request.id]?.agencies?.business_name ||
                    (request.status === "provider_selected" ? "Selected offer missing provider data" : "None")}
                </dd>
              </div>
            </dl>

            <RequestStatusTimeline status={request.status} compact />
            <div className="admin-actions">
              <Link className="button secondary" to={`/consumer/requests/${request.id}`}>
                View Offers
              </Link>
            </div>
          </article>
        ))}
        </div>
    </section>
  );
}

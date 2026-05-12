import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AdminComplianceChecklist } from "../components/AdminComplianceChecklist";
import { AdminMetricCard } from "../components/AdminMetricCard";
import {
  getAdminDashboardSummary,
  getAdminMarketplaceMetrics,
  getRecentAdminBailRequests,
  getRecentAgencyApplications,
  type AdminDashboardSummary,
  type AdminSelectedOffer,
} from "../lib/adminDashboard";
import { getRequestStatusLabel } from "../lib/requestStatus";
import type { Agency, BailRequest } from "../types";

const emptySummary: AdminDashboardSummary = {
  totalBailRequests: 0,
  openRequests: 0,
  offersSubmitted: 0,
  providerSelections: 0,
  pendingAgencies: 0,
  approvedAgencies: 0,
  reviewsPendingLater: 0,
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

export function AdminDashboardPage() {
  const [summary, setSummary] = useState<AdminDashboardSummary>(emptySummary);
  const [recentRequests, setRecentRequests] = useState<BailRequest[]>([]);
  const [recentAgencies, setRecentAgencies] = useState<Agency[]>([]);
  const [recentSelections, setRecentSelections] = useState<AdminSelectedOffer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function loadDashboard() {
    setIsLoading(true);
    setErrorMessage(null);
    setStatusMessage(null);

    const [summaryResult, requestsResult, agenciesResult, metricsResult] = await Promise.all([
      getAdminDashboardSummary(),
      getRecentAdminBailRequests(5),
      getRecentAgencyApplications(6),
      getAdminMarketplaceMetrics(),
    ]);

    setIsLoading(false);

    const failedResult = [summaryResult, requestsResult, agenciesResult, metricsResult].find(
      (result) => !result.ok,
    );

    if (failedResult && !failedResult.ok) {
      setErrorMessage(failedResult.error);
      return;
    }

    if (summaryResult.ok) {
      setSummary(summaryResult.summary);
    }

    if (requestsResult.ok) {
      setRecentRequests(requestsResult.bailRequests);
    }

    if (agenciesResult.ok) {
      setRecentAgencies(agenciesResult.agencies);
    }

    if (metricsResult.ok) {
      setRecentSelections(metricsResult.selectedOffers);
    }

    if (
      (summaryResult.ok && summaryResult.mocked) ||
      (requestsResult.ok && requestsResult.mocked) ||
      (agenciesResult.ok && agenciesResult.mocked) ||
      (metricsResult.ok && metricsResult.mocked)
    ) {
      setStatusMessage("Showing mock admin operations data until Supabase is configured.");
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  const pendingAgencies = recentAgencies.filter(
    (agency) => agency.verification_status === "pending",
  );

  return (
    <section className="page-section">
      <div className="page-heading-row">
        <div>
          <p className="eyebrow">Admin dashboard</p>
          <h1>BailX Operations Center</h1>
          <p>Monitor request flow, provider verification, offer activity, and marketplace health.</p>
        </div>
        <button className="button secondary" type="button" onClick={loadDashboard}>
          Refresh
        </button>
      </div>

      {isLoading ? <p>Loading admin operations...</p> : null}
      {statusMessage ? <p className="form-message success">{statusMessage}</p> : null}
      {errorMessage ? <p className="form-message error">{errorMessage}</p> : null}

      <div className="admin-metrics-grid">
        <AdminMetricCard label="Total bail requests" value={summary.totalBailRequests} />
        <AdminMetricCard label="Open requests" value={summary.openRequests} />
        <AdminMetricCard label="Offers submitted" value={summary.offersSubmitted} />
        <AdminMetricCard label="Provider selections" value={summary.providerSelections} />
        <AdminMetricCard label="Pending agencies" value={summary.pendingAgencies} />
        <AdminMetricCard label="Approved agencies" value={summary.approvedAgencies} />
        <AdminMetricCard
          label="Reviews pending later"
          value={summary.reviewsPendingLater}
          detail="Placeholder for post-MVP review workflows."
        />
      </div>

      <div className="admin-ops-grid">
        <article className="card admin-list-card">
          <div className="admin-list-header">
            <div>
              <p className="eyebrow">Recent requests</p>
              <h2>Bail request activity</h2>
            </div>
            <Link className="button secondary" to="/admin/bail-requests">
              View All
            </Link>
          </div>
          <div className="compact-admin-list">
            {recentRequests.length === 0 ? <p>No recent requests found.</p> : null}
            {recentRequests.map((request) => (
              <Link
                className="admin-compact-row"
                key={request.id}
                to={`/consumer/requests/${request.id}`}
              >
                <span>
                  <strong>{request.defendant_name || "Defendant not listed"}</strong>
                  <small>{request.requester_name || "Unknown requester"}</small>
                </span>
                <span className="status-pill">{getRequestStatusLabel(request.status)}</span>
              </Link>
            ))}
          </div>
        </article>

        <article className="card admin-list-card">
          <div className="admin-list-header">
            <div>
              <p className="eyebrow">Verification queue</p>
              <h2>Pending agency applications</h2>
            </div>
            <Link className="button secondary" to="/admin/agencies">
              Review Agencies
            </Link>
          </div>
          <div className="compact-admin-list">
            {pendingAgencies.length === 0 ? <p>No pending agency applications.</p> : null}
            {pendingAgencies.map((agency) => (
              <div className="admin-compact-row" key={agency.id}>
                <span>
                  <strong>{agency.business_name || "Unnamed agency"}</strong>
                  <small>{agency.contact_name || "No contact listed"}</small>
                </span>
                <span className="status-pill">{agency.verification_status}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="card admin-list-card">
          <div className="admin-list-header">
            <div>
              <p className="eyebrow">Selections</p>
              <h2>Recent provider selections</h2>
            </div>
            <Link className="button secondary" to="/admin/bail-requests">
              Audit Requests
            </Link>
          </div>
          <div className="compact-admin-list">
            {recentSelections.length === 0 ? <p>No provider selections found.</p> : null}
            {recentSelections.map((offer) => (
              <Link
                className="admin-compact-row"
                key={offer.id}
                to={`/consumer/requests/${offer.bail_request_id}`}
              >
                <span>
                  <strong>{offer.agencies?.business_name || "Licensed provider"}</strong>
                  <small>
                    {offer.bail_requests?.defendant_name || "Defendant not listed"} |{" "}
                    {formatDate(offer.updated_at)}
                  </small>
                </span>
                <span className="status-pill urgent">Selected</span>
              </Link>
            ))}
          </div>
        </article>

        <AdminComplianceChecklist />
      </div>
    </section>
  );
}

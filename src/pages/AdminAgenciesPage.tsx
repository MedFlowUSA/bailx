import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AgencyVerificationStatus,
  updateAgencyVerificationStatus,
} from "../lib/agencies";
import { getRecentAgencyApplications } from "../lib/adminDashboard";
import type { Agency } from "../types";

type AgencyFilter = "pending" | "approved" | "more_info_requested" | "rejected";

const filters: { label: string; value: AgencyFilter }[] = [
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "More info requested", value: "more_info_requested" },
  { label: "Rejected", value: "rejected" },
];

export function AdminAgenciesPage() {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [filter, setFilter] = useState<AgencyFilter>("pending");
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingId, setIsUpdatingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function loadAgencies(options: { preserveStatusMessage?: boolean } = {}) {
    setIsLoading(true);
    setErrorMessage(null);

    const result = await getRecentAgencyApplications(100);
    setIsLoading(false);

    if (!result.ok) {
      setErrorMessage(result.error);
      return;
    }

    setAgencies(result.agencies);
    if (!options.preserveStatusMessage) {
      setStatusMessage(
        result.mocked ? "Showing mock agency applications until Supabase is configured." : null,
      );
    }
  }

  async function handleStatusUpdate(agencyId: string, status: AgencyVerificationStatus) {
    setIsUpdatingId(agencyId);
    setErrorMessage(null);
    setStatusMessage(null);

    const result = await updateAgencyVerificationStatus(agencyId, status);
    setIsUpdatingId(null);

    if (!result.ok) {
      setErrorMessage(result.error);
      return;
    }

    setStatusMessage(result.message);
    await loadAgencies({ preserveStatusMessage: true });
  }

  useEffect(() => {
    void loadAgencies();
  }, []);

  const filteredAgencies = agencies.filter((agency) => agency.verification_status === filter);

  return (
    <section className="page-section">
      <div className="page-heading-row">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>Agency Verification Control</h1>
          <p>Review provider identity, coverage, collateral practices, and marketplace status.</p>
        </div>
        <div className="hero-actions">
          <button className="button secondary" type="button" onClick={() => void loadAgencies()}>
            Refresh
          </button>
          <Link className="button secondary" to="/admin/agency-documents">
            Review Documents
          </Link>
        </div>
      </div>

      <div className="filter-row" role="group" aria-label="Filter agency applications">
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

      <article className="card admin-list-card">
        <div className="admin-list-header">
          <div>
            <h2>{filters.find((item) => item.value === filter)?.label} agencies</h2>
            <p>Do not approve agencies without manual license and document verification.</p>
          </div>
        </div>

        {isLoading ? <p>Loading agency applications...</p> : null}
        {statusMessage ? <p className="form-message success">{statusMessage}</p> : null}
        {errorMessage ? <p className="form-message error">{errorMessage}</p> : null}

        {!isLoading && filteredAgencies.length === 0 ? (
          <p>No agencies match this status.</p>
        ) : null}

        <div className="agency-review-list">
          {filteredAgencies.map((agency) => (
            <div className="agency-review-item" key={agency.id}>
              <div>
                <div className="request-card-header">
                  <div>
                    <p className="eyebrow">Created {new Date(agency.created_at).toLocaleDateString()}</p>
                    <h3>{agency.business_name || "Unnamed agency"}</h3>
                  </div>
                  <span className="status-pill">{agency.verification_status}</span>
                </div>
                <dl className="agency-detail-grid">
                  <div>
                    <dt>Contact</dt>
                    <dd>{agency.contact_name || "Not listed"}</dd>
                  </div>
                  <div>
                    <dt>Phone / email</dt>
                    <dd>{[agency.phone, agency.email].filter(Boolean).join(" | ") || "Not listed"}</dd>
                  </div>
                  <div>
                    <dt>License</dt>
                    <dd>{agency.license_number || "Not listed"}</dd>
                  </div>
                  <div>
                    <dt>Counties</dt>
                    <dd>{agency.service_counties?.join(", ") || "Not listed"}</dd>
                  </div>
                  <div>
                    <dt>Languages</dt>
                    <dd>{agency.languages?.join(", ") || "Not listed"}</dd>
                  </div>
                  <div>
                    <dt>Collateral</dt>
                    <dd>{agency.collateral_accepted?.join(", ") || "Not listed"}</dd>
                  </div>
                  <div>
                    <dt>Subscription</dt>
                    <dd>{agency.subscription_tier || "Not selected"}</dd>
                  </div>
                  <div>
                    <dt>Owner profile</dt>
                    <dd>{agency.owner_profile_id || "Not linked"}</dd>
                  </div>
                </dl>
              </div>
              <div className="admin-actions">
                <button
                  className="button secondary"
                  type="button"
                  disabled={isUpdatingId === agency.id}
                  onClick={() => handleStatusUpdate(agency.id, "more_info_requested")}
                >
                  Request More Info
                </button>
                <button
                  className="button secondary danger-button"
                  type="button"
                  disabled={isUpdatingId === agency.id}
                  onClick={() => handleStatusUpdate(agency.id, "rejected")}
                >
                  Reject
                </button>
                <button
                  className="button primary"
                  type="button"
                  disabled={isUpdatingId === agency.id}
                  onClick={() => handleStatusUpdate(agency.id, "approved")}
                >
                  Approve
                </button>
              </div>
            </div>
          ))}
        </div>
      </article>

      <p className="compliance-note">
        BailX admin review is for marketplace eligibility only and does not guarantee
        provider licensing, legal compliance, service quality, pricing, or release outcome.
      </p>
    </section>
  );
}

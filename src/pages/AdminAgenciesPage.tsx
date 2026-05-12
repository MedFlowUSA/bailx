import { useEffect, useState } from "react";
import { AdminVerificationPanel } from "../components/AdminVerificationPanel";
import {
  AgencyVerificationStatus,
  getPendingAgencies,
  updateAgencyVerificationStatus,
} from "../lib/agencies";
import type { Agency } from "../types";

export function AdminAgenciesPage() {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingId, setIsUpdatingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function loadAgencies() {
    setIsLoading(true);
    setErrorMessage(null);

    const result = await getPendingAgencies();
    setIsLoading(false);

    if (!result.ok) {
      setErrorMessage(result.error);
      return;
    }

    setAgencies(result.agencies);
    setStatusMessage(
      result.mocked ? "Showing mock pending agencies until Supabase is configured." : null,
    );
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
    await loadAgencies();
  }

  useEffect(() => {
    void loadAgencies();
  }, []);

  return (
    <section className="page-section">
      <p className="eyebrow">Admin</p>
      <h1>Agency Verification</h1>
      <div className="dashboard-grid">
        <AdminVerificationPanel />
        <article className="card admin-list-card">
          <div className="admin-list-header">
            <div>
              <h2>Pending agencies</h2>
              <p>Review submitted agency applications before marketplace visibility.</p>
            </div>
            <button className="button secondary" type="button" onClick={loadAgencies}>
              Refresh
            </button>
          </div>

          {isLoading ? <p>Loading pending agencies...</p> : null}
          {statusMessage ? <p className="form-message success">{statusMessage}</p> : null}
          {errorMessage ? <p className="form-message error">{errorMessage}</p> : null}

          {!isLoading && agencies.length === 0 ? (
            <p>No pending agency applications.</p>
          ) : null}

          <div className="agency-review-list">
            {agencies.map((agency) => (
              <div className="agency-review-item" key={agency.id}>
                <div>
                  <h3>{agency.business_name || "Unnamed agency"}</h3>
                  <dl className="agency-detail-grid">
                    <div>
                      <dt>Contact</dt>
                      <dd>{agency.contact_name || "Not listed"}</dd>
                    </div>
                    <div>
                      <dt>Phone</dt>
                      <dd>{agency.phone || "Not listed"}</dd>
                    </div>
                    <div>
                      <dt>Email</dt>
                      <dd>{agency.email || "Not listed"}</dd>
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
                      <dt>Created</dt>
                      <dd>{new Date(agency.created_at).toLocaleDateString()}</dd>
                    </div>
                    <div>
                      <dt>Status</dt>
                      <dd>
                        <span className="status-pill">{agency.verification_status}</span>
                      </dd>
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
      </div>
    </section>
  );
}

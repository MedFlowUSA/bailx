import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  createAdminNote,
  getAdminNotesForEntity,
  type AdminNoteType,
} from "../lib/adminNotes";
import {
  AgencyVerificationStatus,
  updateAgencyVerificationStatus,
} from "../lib/agencies";
import { getRecentAgencyApplications } from "../lib/adminDashboard";
import { getAgencyDocumentCountsForAgencies } from "../lib/agencyDocuments";
import type { AdminNote, Agency } from "../types";

type AgencyFilter = "pending" | "approved" | "more_info_requested" | "rejected";

const filters: { label: string; value: AgencyFilter }[] = [
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "More info requested", value: "more_info_requested" },
  { label: "Rejected", value: "rejected" },
];

function formatStatus(value?: AgencyFilter | null) {
  return value ? value.replace(/_/g, " ") : "Not recorded";
}

function formatReviewDate(value?: string | null) {
  return value ? new Date(value).toLocaleString() : "Not reviewed";
}

function getStatusNoteType(status: AgencyVerificationStatus): AdminNoteType {
  return status === "approved" ? "compliance_review" : "status_change";
}

export function AdminAgenciesPage() {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [filter, setFilter] = useState<AgencyFilter>("pending");
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingId, setIsUpdatingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reviewNotesByAgencyId, setReviewNotesByAgencyId] = useState<Record<string, string>>({});
  const [adminNotesByAgencyId, setAdminNotesByAgencyId] = useState<Record<string, string>>({});
  const [recentNotesByAgencyId, setRecentNotesByAgencyId] = useState<Record<string, AdminNote[]>>({});
  const [documentCountsByAgencyId, setDocumentCountsByAgencyId] = useState<Record<string, number>>({});

  async function loadAgencyNotes(nextAgencies: Agency[]) {
    const notesEntries = await Promise.all(
      nextAgencies.map(async (agency) => {
        const result = await getAdminNotesForEntity("agency", agency.id);
        return [agency.id, result.ok ? result.notes : []] as const;
      }),
    );

    setRecentNotesByAgencyId(Object.fromEntries(notesEntries));
  }

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
    await loadAgencyNotes(result.agencies);
    const countsResult = await getAgencyDocumentCountsForAgencies(
      result.agencies.map((agency) => agency.id),
    );
    if (countsResult.ok) {
      setDocumentCountsByAgencyId(countsResult.counts);
    }
    if (!options.preserveStatusMessage) {
      setStatusMessage(
        result.mocked ? "Showing mock agency applications until Supabase is configured." : null,
      );
    }
  }

  async function handleStatusUpdate(agencyId: string, status: AgencyVerificationStatus) {
    const reviewNotes = reviewNotesByAgencyId[agencyId]?.trim() || "";

    if ((status === "more_info_requested" || status === "rejected") && !reviewNotes) {
      setErrorMessage("Add review notes before requesting more information or rejecting.");
      setStatusMessage(null);
      return;
    }

    setIsUpdatingId(agencyId);
    setErrorMessage(null);
    setStatusMessage(null);

    const result = await updateAgencyVerificationStatus(agencyId, status, reviewNotes);
    setIsUpdatingId(null);

    if (!result.ok) {
      setErrorMessage(result.error);
      return;
    }

    const noteResult = await createAdminNote({
      entityType: "agency",
      entityId: agencyId,
      noteType: getStatusNoteType(status),
      message: result.message,
      metadata: {
        status,
        review_notes: reviewNotes || null,
      },
    });

    if (!noteResult.ok) {
      setErrorMessage(noteResult.error);
    }

    setStatusMessage(result.message);
    setReviewNotesByAgencyId((current) => ({ ...current, [agencyId]: "" }));
    await loadAgencies({ preserveStatusMessage: true });
  }

  async function handleAdminNoteSubmit(agencyId: string) {
    const note = adminNotesByAgencyId[agencyId]?.trim() || "";
    const result = await createAdminNote({
      entityType: "agency",
      entityId: agencyId,
      noteType: "admin_note",
      message: note,
    });

    if (!result.ok) {
      setErrorMessage(result.error);
      setStatusMessage(null);
      return;
    }

    setStatusMessage("Admin note saved.");
    setErrorMessage(null);
    setAdminNotesByAgencyId((current) => ({ ...current, [agencyId]: "" }));
    await loadAgencyNotes(agencies.filter((agency) => agency.id === agencyId));
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
        <p className="compliance-note">
          Admin approval is a marketplace eligibility action only. Confirm agency
          licensing and documentation according to BailX internal policy before approval.
        </p>

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
                    <dt>Documents submitted</dt>
                    <dd>{documentCountsByAgencyId[agency.id] || 0}</dd>
                  </div>
                  <div>
                    <dt>Owner profile</dt>
                    <dd>{agency.owner_profile_id || "Not linked"}</dd>
                  </div>
                  {agency.reviewed_at ? (
                    <div>
                      <dt>Reviewed</dt>
                      <dd>{formatReviewDate(agency.reviewed_at)}</dd>
                    </div>
                  ) : null}
                  {agency.reviewed_by_profile_id ? (
                    <div>
                      <dt>Reviewed by</dt>
                      <dd>{agency.reviewed_by_profile_id}</dd>
                    </div>
                  ) : null}
                  {agency.previous_verification_status ? (
                    <div>
                      <dt>Previous status</dt>
                      <dd>{formatStatus(agency.previous_verification_status)}</dd>
                    </div>
                  ) : null}
                  {agency.review_notes ? (
                    <div className="agency-review-notes">
                      <dt>Review notes</dt>
                      <dd>{agency.review_notes}</dd>
                    </div>
                  ) : null}
                </dl>
                <div className="trust-signal-panel">
                  <p className="eyebrow">BailX trust signals</p>
                  <div className="badge-row" aria-label="Agency marketplace trust signals">
                    <span className="soft-badge">
                      Review status: {formatStatus(agency.verification_status)}
                    </span>
                    <span className="soft-badge">
                      Documents submitted: {documentCountsByAgencyId[agency.id] || 0}
                    </span>
                    <span className="soft-badge">
                      Counties: {agency.service_counties?.length || 0}
                    </span>
                    <span className="soft-badge">
                      Languages: {agency.languages?.length || 0}
                    </span>
                    <span className="soft-badge">
                      Collateral categories: {agency.collateral_accepted?.length || 0}
                    </span>
                  </div>
                  <p className="compliance-note">
                    Marketplace trust signals are based on information submitted to
                    BailX and internal platform review. BailX does not guarantee
                    provider licensing status, pricing, release timing, or service outcome.
                  </p>
                </div>
                {(recentNotesByAgencyId[agency.id] || []).length > 0 ? (
                  <div className="admin-note-list">
                    <p className="eyebrow">Recent admin activity</p>
                    {(recentNotesByAgencyId[agency.id] || []).map((note) => (
                      <div className="admin-note-row" key={note.id}>
                        <span>{note.message || note.note}</span>
                        <small>{new Date(note.created_at).toLocaleString()}</small>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="admin-actions">
                <label className="review-notes-field">
                  Review notes
                  <textarea
                    name={`reviewNotes-${agency.id}`}
                    placeholder="Required for more info or rejection"
                    value={reviewNotesByAgencyId[agency.id] || ""}
                    onChange={(event) =>
                      setReviewNotesByAgencyId((current) => ({
                        ...current,
                        [agency.id]: event.target.value,
                      }))
                    }
                  />
                </label>
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
                <label className="review-notes-field">
                  Admin note
                  <textarea
                    name={`adminNote-${agency.id}`}
                    placeholder="Add internal note"
                    value={adminNotesByAgencyId[agency.id] || ""}
                    onChange={(event) =>
                      setAdminNotesByAgencyId((current) => ({
                        ...current,
                        [agency.id]: event.target.value,
                      }))
                    }
                  />
                </label>
                <button
                  className="button secondary"
                  type="button"
                  disabled={isUpdatingId === agency.id}
                  onClick={() => void handleAdminNoteSubmit(agency.id)}
                >
                  Save Note
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

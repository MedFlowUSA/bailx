import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { createAdminNote, getAdminNotesForEntity, type AdminNoteType } from "../lib/adminNotes";
import {
  AgencyVerificationStatus,
  getAgencyForAdminReview,
  updateAgencyVerificationStatus,
} from "../lib/agencies";
import {
  getAgencyDocumentsForAdminReview,
  getSignedAgencyDocumentUrl,
  updateAgencyDocumentReviewStatus,
  type AgencyDocumentReviewStatus,
} from "../lib/agencyDocuments";
import type { AdminNote, Agency, AgencyDocument } from "../types";

type TimelineItem = {
  label: string;
  detail: string;
  date?: string | null;
};

function formatDateTime(value?: string | null) {
  return value ? new Date(value).toLocaleString() : "Not recorded";
}

function formatStatus(value?: string | null) {
  return value ? value.replace(/_/g, " ") : "Not recorded";
}

function formatFileSize(value?: number | null) {
  if (!value) {
    return "Unknown size";
  }

  if (value < 1024 * 1024) {
    return `${Math.round(value / 1024)} KB`;
  }

  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function getStatusNoteType(status: AgencyVerificationStatus): AdminNoteType {
  return status === "approved" ? "compliance_review" : "status_change";
}

function countDocumentsByStatus(documents: AgencyDocument[]) {
  return documents.reduce(
    (counts, document) => ({
      ...counts,
      [document.review_status]: counts[document.review_status] + 1,
    }),
    {
      pending: 0,
      approved: 0,
      rejected: 0,
      more_info_requested: 0,
    },
  );
}

function getReadinessSignals(documents: AgencyDocument[]) {
  const counts = countDocumentsByStatus(documents);
  const signals = [];

  if (documents.length === 0) {
    signals.push({ label: "Verification file incomplete", tone: "urgent" });
  }

  if (counts.pending > 0) {
    signals.push({ label: "Documents pending review", tone: "neutral" });
  }

  if (counts.rejected > 0 || counts.more_info_requested > 0) {
    signals.push({ label: "Documents require attention", tone: "urgent" });
  }

  if (counts.approved > 0) {
    signals.push({ label: "Document file reviewed", tone: "positive" });
  }

  return signals;
}

function buildTimeline(agency: Agency, documents: AgencyDocument[], notes: AdminNote[]) {
  const items: TimelineItem[] = [
    {
      label: "Agency application created",
      detail: agency.business_name || "Agency application",
      date: agency.created_at,
    },
    ...documents.map((document) => ({
      label: `Document ${formatStatus(document.review_status)}`,
      detail: `${document.document_type.replace(/_/g, " ")} | ${document.file_name || "Unnamed document"}`,
      date: document.updated_at || document.created_at,
    })),
    ...notes.map((note) => ({
      label: formatStatus(note.note_type || "admin_note"),
      detail: note.message || note.note,
      date: note.created_at,
    })),
  ];

  if (agency.reviewed_at) {
    items.push({
      label: "Agency review decision",
      detail: `${formatStatus(agency.verification_status)} by ${
        agency.reviewed_by_profile_id || "admin not recorded"
      }`,
      date: agency.reviewed_at,
    });
  }

  return items.sort(
    (a, b) =>
      new Date(b.date || agency.created_at).getTime() -
      new Date(a.date || agency.created_at).getTime(),
  );
}

export function AdminAgencyDetailPage() {
  const { id } = useParams();
  const [agency, setAgency] = useState<Agency | null>(null);
  const [documents, setDocuments] = useState<AgencyDocument[]>([]);
  const [adminNotes, setAdminNotes] = useState<AdminNote[]>([]);
  const [reviewNotes, setReviewNotes] = useState("");
  const [agencyNoteDraft, setAgencyNoteDraft] = useState("");
  const [documentNotesById, setDocumentNotesById] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingAgency, setIsUpdatingAgency] = useState(false);
  const [updatingDocumentId, setUpdatingDocumentId] = useState<string | null>(null);
  const [documentActionId, setDocumentActionId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function loadAgencyFile(options: { preserveStatusMessage?: boolean } = {}) {
    if (!id) {
      setIsLoading(false);
      setErrorMessage("Missing agency id.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    if (!options.preserveStatusMessage) {
      setStatusMessage(null);
    }

    const [agencyResult, documentsResult, notesResult] = await Promise.all([
      getAgencyForAdminReview(id),
      getAgencyDocumentsForAdminReview({ agencyId: id }),
      getAdminNotesForEntity("agency", id),
    ]);

    setIsLoading(false);

    const failedResult = [agencyResult, documentsResult, notesResult].find(
      (result) => !result.ok,
    );

    if (failedResult && !failedResult.ok) {
      setErrorMessage(failedResult.error);
      return;
    }

    if (agencyResult.ok) {
      setAgency(agencyResult.agency);
    }

    if (documentsResult.ok) {
      setDocuments(documentsResult.documents);
    }

    if (notesResult.ok) {
      setAdminNotes(notesResult.notes);
    }

    if (
      (agencyResult.ok && agencyResult.mocked) ||
      (documentsResult.ok && documentsResult.mocked) ||
      (notesResult.ok && notesResult.mocked)
    ) {
      setStatusMessage("Showing mock agency file until Supabase is configured.");
    }
  }

  useEffect(() => {
    void loadAgencyFile();
  }, [id]);

  async function handleAgencyStatusUpdate(status: AgencyVerificationStatus) {
    if (!agency) {
      return;
    }

    const trimmedNotes = reviewNotes.trim();

    if ((status === "more_info_requested" || status === "rejected") && !trimmedNotes) {
      setErrorMessage("Add review notes before requesting more information or rejecting.");
      setStatusMessage(null);
      return;
    }

    setIsUpdatingAgency(true);
    setErrorMessage(null);
    setStatusMessage(null);

    const result = await updateAgencyVerificationStatus(agency.id, status, trimmedNotes);
    setIsUpdatingAgency(false);

    if (!result.ok) {
      setErrorMessage(result.error);
      return;
    }

    const noteResult = await createAdminNote({
      entityType: "agency",
      entityId: agency.id,
      noteType: getStatusNoteType(status),
      message: result.message,
      metadata: {
        status,
        review_notes: trimmedNotes || null,
        source: "agency_detail_file",
      },
    });

    if (!noteResult.ok) {
      setErrorMessage(noteResult.error);
      return;
    }

    setReviewNotes("");
    setStatusMessage(result.message);
    await loadAgencyFile({ preserveStatusMessage: true });
  }

  async function handleAgencyNoteSubmit() {
    if (!agency) {
      return;
    }

    const result = await createAdminNote({
      entityType: "agency",
      entityId: agency.id,
      noteType: "admin_note",
      message: agencyNoteDraft,
      metadata: {
        source: "agency_detail_file",
      },
    });

    if (!result.ok) {
      setErrorMessage(result.error);
      setStatusMessage(null);
      return;
    }

    setAgencyNoteDraft("");
    setStatusMessage("Admin note saved.");
    await loadAgencyFile({ preserveStatusMessage: true });
  }

  async function handleDocumentAccess(document: AgencyDocument, action: "view" | "download") {
    setDocumentActionId(`${document.id}-${action}`);
    setErrorMessage(null);
    setStatusMessage(null);

    const result = await getSignedAgencyDocumentUrl(document.id);
    setDocumentActionId(null);

    if (!result.ok) {
      setErrorMessage(result.error);
      return;
    }

    if (action === "view") {
      const opened = window.open(result.signedUrl, "_blank", "noopener,noreferrer");

      if (!opened) {
        setErrorMessage("Allow pop-ups to view this secure document.");
        return;
      }
    } else {
      const link = window.document.createElement("a");
      link.href = result.signedUrl;
      link.download = document.file_name || "agency-document";
      link.rel = "noreferrer";
      window.document.body.appendChild(link);
      link.click();
      link.remove();
    }

    const noteResult = await createAdminNote({
      entityType: "agency_document",
      entityId: document.id,
      noteType: "compliance_review",
      message:
        action === "view"
          ? "Admin generated a secure signed URL to review this document."
          : "Admin generated a secure signed URL to download this document.",
      metadata: {
        agency_id: document.agency_id,
        document_id: document.id,
        expires_in_seconds: result.expiresInSeconds,
        action: `${action}_signed_url_generated`,
      },
    });

    if (!noteResult.ok) {
      setErrorMessage(noteResult.error);
      return;
    }

    setStatusMessage(
      action === "view"
        ? "Secure document view link opened. Link expires in 5 minutes."
        : "Secure document download started. Link expires in 5 minutes.",
    );
  }

  async function handleDocumentReview(
    document: AgencyDocument,
    status: AgencyDocumentReviewStatus,
  ) {
    const adminNotes = documentNotesById[document.id] || "";

    setUpdatingDocumentId(document.id);
    setErrorMessage(null);
    setStatusMessage(null);

    const result = await updateAgencyDocumentReviewStatus(document.id, status, adminNotes);
    setUpdatingDocumentId(null);

    if (!result.ok) {
      setErrorMessage(result.error);
      return;
    }

    const noteResult = await createAdminNote({
      entityType: "agency_document",
      entityId: document.id,
      noteType: "document_review",
      message: `Agency document marked ${status}.`,
      metadata: {
        agency_id: document.agency_id,
        document_id: document.id,
        status,
        admin_notes: adminNotes || null,
        source: "agency_detail_file",
      },
    });

    if (!noteResult.ok) {
      setErrorMessage(noteResult.error);
      return;
    }

    setDocumentNotesById((current) => ({ ...current, [document.id]: "" }));
    setStatusMessage(result.message);
    await loadAgencyFile({ preserveStatusMessage: true });
  }

  const documentCounts = countDocumentsByStatus(documents);
  const readinessSignals = getReadinessSignals(documents);
  const timeline = agency ? buildTimeline(agency, documents, adminNotes) : [];

  return (
    <section className="page-section">
      <div className="page-heading-row">
        <div>
          <p className="eyebrow">Admin agency file</p>
          <h1>Agency Verification Command Center</h1>
          <p>Review provider eligibility, private documents, audit notes, and final decisions.</p>
        </div>
        <div className="hero-actions">
          <button className="button secondary" type="button" onClick={() => void loadAgencyFile()}>
            Refresh
          </button>
          <Link className="button secondary" to="/admin/agencies">
            Back to Agencies
          </Link>
        </div>
      </div>

      {isLoading ? <p>Loading agency verification file...</p> : null}
      {statusMessage ? <p className="form-message success">{statusMessage}</p> : null}
      {errorMessage ? <p className="form-message error">{errorMessage}</p> : null}
      {!isLoading && !agency ? <p>No agency file found.</p> : null}

      {agency ? (
        <>
          <article className="card admin-list-card">
            <div className="request-card-header">
              <div>
                <p className="eyebrow">Agency profile overview</p>
                <h2>{agency.business_name || "Unnamed agency"}</h2>
                <p>{agency.contact_name || "Contact not listed"}</p>
              </div>
              <span className="status-pill">{formatStatus(agency.verification_status)}</span>
            </div>
            <dl className="agency-detail-grid">
              <div>
                <dt>Owner profile</dt>
                <dd>{agency.owner_profile_id || "Not linked"}</dd>
              </div>
              {agency.verification_status === "unclaimed_directory" ? (
                <div className="agency-review-notes">
                  <dt>Directory disclaimer</dt>
                  <dd>
                    {agency.public_listing_disclaimer ||
                      "Unclaimed public listing. This provider has not completed BailX marketplace verification."}
                  </dd>
                </div>
              ) : null}
              <div>
                <dt>Phone / email</dt>
                <dd>{[agency.phone, agency.email].filter(Boolean).join(" | ") || "Not listed"}</dd>
              </div>
              <div>
                <dt>License information</dt>
                <dd>{agency.license_number || "Not listed"}</dd>
              </div>
              <div>
                <dt>Subscription tier</dt>
                <dd>{agency.subscription_tier || "Not selected"}</dd>
              </div>
              <div>
                <dt>Service counties</dt>
                <dd>{agency.service_counties?.join(", ") || "Not listed"}</dd>
              </div>
              <div>
                <dt>Languages</dt>
                <dd>{agency.languages?.join(", ") || "Not listed"}</dd>
              </div>
              <div>
                <dt>Collateral accepted</dt>
                <dd>{agency.collateral_accepted?.join(", ") || "Not listed"}</dd>
              </div>
              {agency.source_type ? (
                <div>
                  <dt>Source type</dt>
                  <dd>{agency.source_type}</dd>
                </div>
              ) : null}
              {agency.source_url ? (
                <div>
                  <dt>Source URL</dt>
                  <dd>{agency.source_url}</dd>
                </div>
              ) : null}
              <div>
                <dt>Created / updated</dt>
                <dd>
                  {formatDateTime(agency.created_at)} | {formatDateTime(agency.updated_at)}
                </dd>
              </div>
              <div>
                <dt>Reviewed by</dt>
                <dd>{agency.reviewed_by_profile_id || "Not reviewed"}</dd>
              </div>
              <div>
                <dt>Reviewed at</dt>
                <dd>{formatDateTime(agency.reviewed_at)}</dd>
              </div>
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
          </article>

          <section className="summary-grid">
            <article className="card summary-card">
              <span>Documents submitted</span>
              <strong>{documents.length}</strong>
            </article>
            <article className="card summary-card">
              <span>Pending review</span>
              <strong>{documentCounts.pending}</strong>
            </article>
            <article className="card summary-card">
              <span>Approved</span>
              <strong>{documentCounts.approved}</strong>
            </article>
            <article className="card summary-card">
              <span>Requires attention</span>
              <strong>{documentCounts.rejected + documentCounts.more_info_requested}</strong>
            </article>
          </section>

          <article className="card admin-list-card">
            <div className="admin-list-header">
              <div>
                <p className="eyebrow">Completeness signals</p>
                <h2>Verification readiness</h2>
              </div>
            </div>
            <div className="badge-row">
              {readinessSignals.map((signal) => (
                <span
                  className={signal.tone === "urgent" ? "status-pill urgent" : "soft-badge"}
                  key={signal.label}
                >
                  {signal.label}
                </span>
              ))}
              <span className="soft-badge">Expiration metadata: Not recorded</span>
            </div>
            <p className="compliance-note">
              Admin approval is a marketplace eligibility action only. Confirm
              agency licensing and documentation according to BailX internal policy before approval.
              Unclaimed directory listings must be converted to pending verification only after
              provider contact and must not receive live marketplace leads.
            </p>
          </article>

          <article className="card admin-list-card">
            <div className="admin-list-header">
              <div>
                <p className="eyebrow">Private documents</p>
                <h2>Submitted verification files</h2>
              </div>
              <span className="status-pill">{documents.length} files</span>
            </div>
            {documents.length === 0 ? <p>No agency documents have been uploaded.</p> : null}
            <div className="agency-review-list">
              {documents.map((document) => (
                <div className="agency-review-item" key={document.id}>
                  <div>
                    <div className="request-card-header">
                      <div>
                        <p className="eyebrow">Uploaded {formatDateTime(document.created_at)}</p>
                        <h3>{document.file_name || "Unnamed document"}</h3>
                      </div>
                      <span
                        className={
                          document.review_status === "rejected" ||
                          document.review_status === "more_info_requested"
                            ? "status-pill urgent"
                            : "status-pill"
                        }
                      >
                        {formatStatus(document.review_status)}
                      </span>
                    </div>
                    <dl className="agency-detail-grid">
                      <div>
                        <dt>Type</dt>
                        <dd>{document.document_type.replace(/_/g, " ")}</dd>
                      </div>
                      <div>
                        <dt>File</dt>
                        <dd>{document.file_name || "Not listed"}</dd>
                      </div>
                      <div>
                        <dt>Mime / size</dt>
                        <dd>
                          {[document.mime_type || "Unknown mime", formatFileSize(document.file_size)].join(
                            " | ",
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt>Updated</dt>
                        <dd>{formatDateTime(document.updated_at)}</dd>
                      </div>
                      <div className="agency-review-notes">
                        <dt>Admin document notes</dt>
                        <dd>{document.admin_notes || "No document notes yet"}</dd>
                      </div>
                    </dl>
                    <div className="admin-actions">
                      <button
                        className="button secondary"
                        type="button"
                        disabled={documentActionId === `${document.id}-view`}
                        onClick={() => void handleDocumentAccess(document, "view")}
                      >
                        {documentActionId === `${document.id}-view` ? "Opening..." : "View Document"}
                      </button>
                      <button
                        className="button secondary"
                        type="button"
                        disabled={documentActionId === `${document.id}-download`}
                        onClick={() => void handleDocumentAccess(document, "download")}
                      >
                        {documentActionId === `${document.id}-download`
                          ? "Preparing..."
                          : "Download Document"}
                      </button>
                    </div>
                  </div>
                  <div className="admin-actions">
                    <label className="review-notes-field">
                      Document review notes
                      <textarea
                        placeholder="Optional review notes"
                        value={documentNotesById[document.id] || ""}
                        onChange={(event) =>
                          setDocumentNotesById((current) => ({
                            ...current,
                            [document.id]: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <button
                      className="button secondary"
                      type="button"
                      disabled={updatingDocumentId === document.id}
                      onClick={() => void handleDocumentReview(document, "more_info_requested")}
                    >
                      Request More Info
                    </button>
                    <button
                      className="button secondary danger-button"
                      type="button"
                      disabled={updatingDocumentId === document.id}
                      onClick={() => void handleDocumentReview(document, "rejected")}
                    >
                      Reject
                    </button>
                    <button
                      className="button primary"
                      type="button"
                      disabled={updatingDocumentId === document.id}
                      onClick={() => void handleDocumentReview(document, "approved")}
                    >
                      Approve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="card admin-list-card">
            <div className="admin-list-header">
              <div>
                <p className="eyebrow">Decision panel</p>
                <h2>Agency review action</h2>
              </div>
            </div>
            <label>
              Review notes
              <textarea
                placeholder="Required for more information requests or rejection"
                value={reviewNotes}
                onChange={(event) => setReviewNotes(event.target.value)}
              />
            </label>
            <div className="admin-actions">
              <button
                className="button secondary"
                type="button"
                disabled={isUpdatingAgency}
                onClick={() => void handleAgencyStatusUpdate("more_info_requested")}
              >
                Request More Info
              </button>
              <button
                className="button secondary danger-button"
                type="button"
                disabled={isUpdatingAgency}
                onClick={() => void handleAgencyStatusUpdate("rejected")}
              >
                Reject Agency
              </button>
              <button
                className="button primary"
                type="button"
                disabled={isUpdatingAgency || agency.verification_status === "unclaimed_directory"}
                onClick={() => void handleAgencyStatusUpdate("approved")}
              >
                Approve Agency
              </button>
            </div>
          </article>

          <section className="dashboard-grid">
            <article className="card admin-list-card">
              <div className="admin-list-header">
                <div>
                  <p className="eyebrow">Review history</p>
                  <h2>Admin notes</h2>
                </div>
              </div>
              <label>
                Add agency note
                <textarea
                  placeholder="Add internal agency review note"
                  value={agencyNoteDraft}
                  onChange={(event) => setAgencyNoteDraft(event.target.value)}
                />
              </label>
              <div className="admin-actions">
                <button className="button secondary" type="button" onClick={() => void handleAgencyNoteSubmit()}>
                  Save Note
                </button>
              </div>
              <div className="admin-note-list">
                {adminNotes.length === 0 ? <p>No agency admin notes yet.</p> : null}
                {adminNotes.map((note) => (
                  <div className="admin-note-row" key={note.id}>
                    <span>{note.message || note.note}</span>
                    <small>{formatDateTime(note.created_at)}</small>
                  </div>
                ))}
              </div>
            </article>

            <article className="card admin-list-card">
              <div className="admin-list-header">
                <div>
                  <p className="eyebrow">Operational timeline</p>
                  <h2>Verification timeline</h2>
                </div>
              </div>
              <div className="admin-note-list">
                {timeline.map((item) => (
                  <div className="admin-note-row" key={`${item.label}-${item.date}-${item.detail}`}>
                    <span>
                      <strong>{item.label}</strong>
                      <small>{item.detail}</small>
                    </span>
                    <small>{formatDateTime(item.date)}</small>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <p className="compliance-note">
            Agency verification is an internal marketplace eligibility workflow.
            BailX does not guarantee provider licensing status, pricing, financing,
            timing, release, or service outcome.
          </p>
        </>
      ) : null}
    </section>
  );
}

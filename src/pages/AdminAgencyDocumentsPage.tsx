import { useEffect, useState } from "react";
import {
  getAgencyDocumentsForAdminReview,
  getSignedAgencyDocumentUrl,
  updateAgencyDocumentReviewStatus,
  type AgencyDocumentReviewStatus,
} from "../lib/agencyDocuments";
import { createAdminNote } from "../lib/adminNotes";
import type { AgencyDocument } from "../types";

function formatFileSize(value?: number | null) {
  if (!value) {
    return "Unknown size";
  }

  if (value < 1024 * 1024) {
    return `${Math.round(value / 1024)} KB`;
  }

  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

export function AdminAgencyDocumentsPage() {
  const [documents, setDocuments] = useState<AgencyDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [documentActionId, setDocumentActionId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function loadDocuments(options: { preserveStatusMessage?: boolean } = {}) {
    setIsLoading(true);
    setErrorMessage(null);

    const result = await getAgencyDocumentsForAdminReview({ limit: 100 });
    setIsLoading(false);

    if (!result.ok) {
      setErrorMessage(result.error);
      return;
    }

    setDocuments(result.documents);
    if (!options.preserveStatusMessage) {
      setStatusMessage(
        result.mocked ? "Showing mock agency documents until Supabase is configured." : null,
      );
    }
  }

  useEffect(() => {
    void loadDocuments();
  }, []);

  async function handleReview(
    form: HTMLFormElement,
    documentId: string,
    status: AgencyDocumentReviewStatus,
  ) {
    const formData = new FormData(form);
    const adminNotes = String(formData.get("adminNotes") || "");

    setUpdatingId(documentId);
    setErrorMessage(null);
    setStatusMessage(null);

    const result = await updateAgencyDocumentReviewStatus(
      documentId,
      status,
      adminNotes,
    );

    setUpdatingId(null);

    if (!result.ok) {
      setErrorMessage(result.error);
      return;
    }

    const noteResult = await createAdminNote({
      entityType: "agency_document",
      entityId: documentId,
      noteType: "document_review",
      message: `Agency document marked ${status}.`,
      metadata: {
        document_id: documentId,
        status,
        admin_notes: adminNotes || null,
        agency_id: result.document.agency_id,
      },
    });

    if (!noteResult.ok) {
      setErrorMessage(noteResult.error);
    }

    setStatusMessage(result.message);
    await loadDocuments({ preserveStatusMessage: true });
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
        document_id: document.id,
        agency_id: document.agency_id,
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

  return (
    <section className="page-section">
      <div className="page-heading-row">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>Agency Documents</h1>
          <p>Review private verification files through short-lived signed URLs.</p>
        </div>
        <button className="button secondary" type="button" onClick={() => void loadDocuments()}>
          Refresh
        </button>
      </div>

      <article className="card admin-list-card">
        {isLoading ? <p>Loading pending documents...</p> : null}
        {statusMessage ? <p className="form-message success">{statusMessage}</p> : null}
        {errorMessage ? <p className="form-message error">{errorMessage}</p> : null}
        {!isLoading && documents.length === 0 ? <p>No agency documents found.</p> : null}

        <div className="agency-review-list">
          {documents.map((document) => (
            <div className="agency-review-item" key={document.id}>
              <div>
                <h3>{document.file_name || "Unnamed document"}</h3>
                <dl className="agency-detail-grid">
                  <div>
                    <dt>Agency</dt>
                    <dd>{document.agencies?.business_name || "Agency not listed"}</dd>
                  </div>
                  <div>
                    <dt>Type</dt>
                    <dd>{document.document_type.replace(/_/g, " ")}</dd>
                  </div>
                  <div>
                    <dt>Mime</dt>
                    <dd>{document.mime_type || "Not listed"}</dd>
                  </div>
                  <div>
                    <dt>Size</dt>
                    <dd>{formatFileSize(document.file_size)}</dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd>
                      <span className="status-pill">
                        {document.review_status.replace(/_/g, " ")}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt>Created</dt>
                    <dd>{new Date(document.created_at).toLocaleDateString()}</dd>
                  </div>
                  <div>
                    <dt>Admin notes</dt>
                    <dd>{document.admin_notes || "No notes yet"}</dd>
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
                    {documentActionId === `${document.id}-download` ? "Preparing..." : "Download Document"}
                  </button>
                </div>
              </div>
              <form className="admin-actions" onSubmit={(event) => event.preventDefault()}>
                <label>
                  Admin notes
                  <textarea name="adminNotes" placeholder="Optional review notes" />
                </label>
                <button
                  className="button secondary"
                  type="button"
                  disabled={updatingId === document.id}
                  onClick={(event) =>
                    void handleReview(event.currentTarget.form!, document.id, "more_info_requested")
                  }
                >
                  Request More Info
                </button>
                <button
                  className="button secondary danger-button"
                  type="button"
                  disabled={updatingId === document.id}
                  onClick={(event) =>
                    void handleReview(event.currentTarget.form!, document.id, "rejected")
                  }
                >
                  Reject
                </button>
                <button
                  className="button primary"
                  type="button"
                  disabled={updatingId === document.id}
                  onClick={(event) =>
                    void handleReview(event.currentTarget.form!, document.id, "approved")
                  }
                >
                  Approve
                </button>
              </form>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}

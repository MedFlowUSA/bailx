import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { RequestStatusTimeline } from "../components/RequestStatusTimeline";
import {
  getAdminBailRequestDetail,
  getAdminNotificationEventsForEntity,
  getAdminOffersForBailRequest,
} from "../lib/adminBailRequests";
import { createAdminNote, getAdminNotesForEntity } from "../lib/adminNotes";
import { getRequestStatusLabel } from "../lib/requestStatus";
import type { AdminNote, AgencyOffer, BailRequest, NotificationEvent } from "../types";

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

function formatDateTime(value?: string | null) {
  return value ? new Date(value).toLocaleString() : "Not recorded";
}

function formatPayload(payload: Record<string, unknown>) {
  const text = JSON.stringify(payload || {}, null, 2);
  return text.length > 220 ? `${text.slice(0, 220)}...` : text;
}

export function AdminBailRequestDetailPage() {
  const { id } = useParams();
  const [bailRequest, setBailRequest] = useState<BailRequest | null>(null);
  const [offers, setOffers] = useState<AgencyOffer[]>([]);
  const [adminNotes, setAdminNotes] = useState<AdminNote[]>([]);
  const [notificationEvents, setNotificationEvents] = useState<NotificationEvent[]>([]);
  const [noteDraft, setNoteDraft] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function loadDetail(options: { preserveStatusMessage?: boolean } = {}) {
    if (!id) {
      setErrorMessage("Missing bail request id.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    if (!options.preserveStatusMessage) {
      setStatusMessage(null);
    }

    const [requestResult, offersResult, notesResult, eventsResult] = await Promise.all([
      getAdminBailRequestDetail(id),
      getAdminOffersForBailRequest(id),
      getAdminNotesForEntity("bail_request", id),
      getAdminNotificationEventsForEntity("bail_request", id),
    ]);

    setIsLoading(false);

    const failedResult = [requestResult, offersResult, notesResult, eventsResult].find(
      (result) => !result.ok,
    );

    if (failedResult && !failedResult.ok) {
      setErrorMessage(failedResult.error);
      return;
    }

    if (requestResult.ok) {
      setBailRequest(requestResult.bailRequest);
    }

    if (offersResult.ok) {
      setOffers(offersResult.offers);
    }

    if (notesResult.ok) {
      setAdminNotes(notesResult.notes);
    }

    if (eventsResult.ok) {
      setNotificationEvents(eventsResult.events);
    }

    if (
      (requestResult.ok && requestResult.mocked) ||
      (offersResult.ok && offersResult.mocked) ||
      (notesResult.ok && notesResult.mocked) ||
      (eventsResult.ok && eventsResult.mocked)
    ) {
      setStatusMessage("Showing mock admin request detail until Supabase is configured.");
    }
  }

  useEffect(() => {
    void loadDetail();
  }, [id]);

  async function handleSaveNote() {
    if (!id) {
      return;
    }

    setIsSavingNote(true);
    setErrorMessage(null);
    setStatusMessage(null);

    const result = await createAdminNote({
      entityType: "bail_request",
      entityId: id,
      noteType: "admin_note",
      message: noteDraft,
    });

    setIsSavingNote(false);

    if (!result.ok) {
      setErrorMessage(result.error);
      return;
    }

    setNoteDraft("");
    setStatusMessage("Admin note saved.");
    await loadDetail({ preserveStatusMessage: true });
  }

  const selectedOffer = offers.find((offer) => offer.status === "selected");

  return (
    <section className="page-section">
      <div className="page-heading-row">
        <div>
          <p className="eyebrow">Admin audit</p>
          <h1>Bail Request Detail</h1>
          <p>Review request facts, provider offers, notes, and notification history.</p>
        </div>
        <div className="hero-actions">
          <button className="button secondary" type="button" onClick={() => void loadDetail()}>
            Refresh
          </button>
          <Link className="button secondary" to="/admin/bail-requests">
            Back to Requests
          </Link>
        </div>
      </div>

      {isLoading ? <p>Loading bail request audit...</p> : null}
      {statusMessage ? <p className="form-message success">{statusMessage}</p> : null}
      {errorMessage ? <p className="form-message error">{errorMessage}</p> : null}
      {!isLoading && !bailRequest ? <p>No bail request found.</p> : null}

      {bailRequest ? (
        <>
          <article className="card admin-list-card">
            <div className="request-card-header">
              <div>
                <p className="eyebrow">Request overview</p>
                <h2>{bailRequest.defendant_name || "Defendant not listed"}</h2>
                <p>{bailRequest.requester_name || "Requester not listed"}</p>
              </div>
              <span
                className={
                  bailRequest.status === "provider_selected" ||
                  bailRequest.urgency_level === "critical" ||
                  bailRequest.urgency_level === "urgent"
                    ? "status-pill urgent"
                    : "status-pill"
                }
              >
                {getRequestStatusLabel(bailRequest.status)}
              </span>
            </div>

            <dl className="agency-detail-grid">
              <div>
                <dt>Requester contact</dt>
                <dd>
                  {[bailRequest.requester_phone, bailRequest.requester_email]
                    .filter(Boolean)
                    .join(" | ") || "Not listed"}
                </dd>
              </div>
              <div>
                <dt>Defendant</dt>
                <dd>{bailRequest.defendant_name || "Not listed"}</dd>
              </div>
              <div>
                <dt>Jail</dt>
                <dd>{bailRequest.jail_location || "Not listed"}</dd>
              </div>
              <div>
                <dt>City / county / state</dt>
                <dd>
                  {[bailRequest.jail_city, bailRequest.jail_county, bailRequest.jail_state]
                    .filter(Boolean)
                    .join(", ") || "Not listed"}
                </dd>
              </div>
              <div>
                <dt>Bond amount</dt>
                <dd>{formatMoney(bailRequest.bond_amount)}</dd>
              </div>
              <div>
                <dt>Charges</dt>
                <dd>{bailRequest.charges || "Not listed"}</dd>
              </div>
              <div>
                <dt>Urgency</dt>
                <dd>{bailRequest.urgency_level}</dd>
              </div>
              <div>
                <dt>Language</dt>
                <dd>{bailRequest.preferred_language || "Not listed"}</dd>
              </div>
              <div>
                <dt>Collateral</dt>
                <dd>{bailRequest.collateral_available?.join(", ") || "Not listed"}</dd>
              </div>
              <div>
                <dt>Created / updated</dt>
                <dd>
                  {formatDateTime(bailRequest.created_at)} | {formatDateTime(bailRequest.updated_at)}
                </dd>
              </div>
              {bailRequest.notes ? (
                <div className="agency-review-notes">
                  <dt>Request notes</dt>
                  <dd>{bailRequest.notes}</dd>
                </div>
              ) : null}
            </dl>

            <RequestStatusTimeline status={bailRequest.status} compact />
          </article>

          <article className="card admin-list-card">
            <div className="admin-list-header">
              <div>
                <p className="eyebrow">Consent audit</p>
                <h2>Intake disclosure metadata</h2>
              </div>
            </div>
            <dl className="agency-detail-grid">
              <div>
                <dt>Provider sharing consent</dt>
                <dd>{bailRequest.consent_marketplace_share ? "Recorded" : "Not recorded"}</dd>
              </div>
              <div>
                <dt>No legal advice acknowledgement</dt>
                <dd>{bailRequest.consent_no_legal_advice ? "Recorded" : "Not recorded"}</dd>
              </div>
              <div>
                <dt>Terms and privacy agreement</dt>
                <dd>{bailRequest.consent_terms_privacy ? "Recorded" : "Not recorded"}</dd>
              </div>
              <div>
                <dt>Consented at</dt>
                <dd>{formatDateTime(bailRequest.consented_at)}</dd>
              </div>
            </dl>
          </article>

          {selectedOffer ? (
            <article className="card selected-offer">
              <p className="eyebrow">Selected provider audit</p>
              <h2>{selectedOffer.agencies?.business_name || "Selected provider"}</h2>
              <dl className="agency-detail-grid">
                <div>
                  <dt>Status</dt>
                  <dd>{selectedOffer.status}</dd>
                </div>
                <div>
                  <dt>Down payment</dt>
                  <dd>{formatMoney(selectedOffer.down_payment)}</dd>
                </div>
                <div>
                  <dt>Estimated release</dt>
                  <dd>{selectedOffer.estimated_release_time || "Not listed"}</dd>
                </div>
                <div>
                  <dt>Selected at</dt>
                  <dd>{formatDateTime(selectedOffer.updated_at)}</dd>
                </div>
              </dl>
            </article>
          ) : null}

          <article className="card admin-list-card">
            <div className="admin-list-header">
              <div>
                <p className="eyebrow">Offer audit</p>
                <h2>Provider offers</h2>
              </div>
              <span className="status-pill">{offers.length} offers</span>
            </div>
            {offers.length === 0 ? <p>No offers submitted for this request.</p> : null}
            <div className="agency-review-list">
              {offers.map((offer) => (
                <div className="agency-review-item" key={offer.id}>
                  <div>
                    <div className="request-card-header">
                      <div>
                        <p className="eyebrow">Created {formatDateTime(offer.created_at)}</p>
                        <h3>{offer.agencies?.business_name || "Agency not listed"}</h3>
                      </div>
                      <span className={offer.status === "selected" ? "status-pill urgent" : "status-pill"}>
                        {offer.status}
                      </span>
                    </div>
                    <dl className="agency-detail-grid">
                      <div>
                        <dt>Down payment</dt>
                        <dd>{formatMoney(offer.down_payment)}</dd>
                      </div>
                      <div>
                        <dt>Estimated release</dt>
                        <dd>{offer.estimated_release_time || "Not listed"}</dd>
                      </div>
                      <div>
                        <dt>Financing</dt>
                        <dd>{offer.financing_available ? "Available" : "Not listed"}</dd>
                      </div>
                        <div>
                          <dt>Outcome</dt>
                          <dd>{offer.status === "selected" ? "Selected" : offer.status === "declined" ? "Declined" : "Open"}</dd>
                        </div>
                        <div>
                          <dt>Created</dt>
                          <dd>{formatDateTime(offer.created_at)}</dd>
                        </div>
                      {offer.collateral_notes ? (
                        <div className="agency-review-notes">
                          <dt>Collateral notes</dt>
                          <dd>{offer.collateral_notes}</dd>
                        </div>
                      ) : null}
                      {offer.message ? (
                        <div className="agency-review-notes">
                          <dt>Message</dt>
                          <dd>{offer.message}</dd>
                        </div>
                      ) : null}
                    </dl>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="card admin-list-card">
            <div className="admin-list-header">
              <div>
                <p className="eyebrow">Admin notes</p>
                <h2>Internal request notes</h2>
              </div>
            </div>
            <label>
              Add note
              <textarea
                placeholder="Add an internal admin note"
                value={noteDraft}
                onChange={(event) => setNoteDraft(event.target.value)}
              />
            </label>
            <div className="admin-actions">
              <button
                className="button secondary"
                type="button"
                disabled={isSavingNote}
                onClick={() => void handleSaveNote()}
              >
                Save Note
              </button>
            </div>
            <div className="admin-note-list">
              {adminNotes.length === 0 ? <p>No admin notes yet.</p> : null}
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
                <p className="eyebrow">Notifications</p>
                <h2>Request notification events</h2>
              </div>
              <Link className="button secondary" to="/admin/notifications">
                View All
              </Link>
            </div>
            {notificationEvents.length === 0 ? <p>No notification events for this request.</p> : null}
            {notificationEvents.map((event) => (
              <div className="admin-note-row" key={event.id}>
                <span>
                  <strong>{event.event_type.replace(/_/g, " ")}</strong>
                  <small>
                    {event.channel} | {event.status} | {formatDateTime(event.created_at)}
                  </small>
                  <pre className="payload-preview">{formatPayload(event.payload)}</pre>
                </span>
              </div>
            ))}
          </article>

          <p className="compliance-note">
            Admin review is an operational audit aid. Confirm provider terms, legal compliance,
            licensing, and release details directly with the responsible parties before action.
          </p>
        </>
      ) : null}
    </section>
  );
}

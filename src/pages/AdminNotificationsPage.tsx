import { useEffect, useState } from "react";
import {
  getNotificationEventsForAdmin,
  markNotificationEventSkipped,
  processPendingNotificationEvents,
  retryNotificationEvent,
  type NotificationAdminFilters,
} from "../lib/notificationProcessor";
import type {
  NotificationChannel,
  NotificationEventType,
  NotificationStatus,
} from "../lib/notificationEvents";
import type { NotificationEvent } from "../types";

type StatusFilter = NotificationStatus | "all";
type ChannelFilter = NotificationChannel | "all";
type EventTypeFilter = NotificationEventType | "all";

const statusFilters: { label: string; value: StatusFilter }[] = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Processed", value: "processed" },
  { label: "Failed", value: "failed" },
  { label: "Skipped", value: "skipped" },
];

const channelFilters: { label: string; value: ChannelFilter }[] = [
  { label: "All channels", value: "all" },
  { label: "In-app", value: "in_app" },
  { label: "Email", value: "email" },
  { label: "SMS", value: "sms" },
];

const eventTypeFilters: { label: string; value: EventTypeFilter }[] = [
  { label: "All event types", value: "all" },
  { label: "Bail request submitted", value: "bail_request_submitted" },
  { label: "Agency matched to request", value: "agency_matched_to_request" },
  { label: "Agency offer submitted", value: "agency_offer_submitted" },
  { label: "Provider selected", value: "provider_selected" },
  { label: "Agency application submitted", value: "agency_application_submitted" },
  { label: "Agency approved", value: "agency_approved" },
  { label: "Agency more info requested", value: "agency_more_info_requested" },
  { label: "Agency rejected", value: "agency_rejected" },
  { label: "Agency document uploaded", value: "agency_document_uploaded" },
  { label: "Agency document reviewed", value: "agency_document_reviewed" },
];

function formatPayload(payload: Record<string, unknown>) {
  const text = JSON.stringify(payload || {}, null, 2);
  return text.length > 320 ? `${text.slice(0, 320)}...` : text;
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString() : "Not recorded";
}

function formatLabel(value: string) {
  return value.replace(/_/g, " ");
}

function statusClass(status: NotificationStatus) {
  if (status === "failed") {
    return "status-pill urgent";
  }

  if (status === "processed") {
    return "status-pill selected";
  }

  return "status-pill";
}

export function AdminNotificationsPage() {
  const [events, setEvents] = useState<NotificationEvent[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("all");
  const [eventTypeFilter, setEventTypeFilter] = useState<EventTypeFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function loadEvents() {
    setIsLoading(true);
    setErrorMessage(null);

    const filters: NotificationAdminFilters = {
      status: statusFilter,
      channel: channelFilter,
      eventType: eventTypeFilter,
      limit: 100,
    };
    const result = await getNotificationEventsForAdmin(filters);
    setIsLoading(false);

    if (!result.ok) {
      setErrorMessage(result.error);
      return;
    }

    setEvents(result.events);
    setStatusMessage(
      result.mocked ? "Showing mock notification events until Supabase is configured." : null,
    );
  }

  useEffect(() => {
    void loadEvents();
  }, [statusFilter, channelFilter, eventTypeFilter]);

  async function handleRetry(eventId: string) {
    setProcessingId(eventId);
    setErrorMessage(null);
    setStatusMessage(null);

    const result = await retryNotificationEvent(eventId);
    setProcessingId(null);

    if (!result.ok) {
      setErrorMessage(result.error);
      return;
    }

    setStatusMessage(result.message);
    await loadEvents();
  }

  async function handleSkip(eventId: string) {
    const reason = window.prompt("Reason for skipping this notification event?");

    if (!reason) {
      return;
    }

    setProcessingId(eventId);
    setErrorMessage(null);
    setStatusMessage(null);

    const result = await markNotificationEventSkipped(eventId, reason);
    setProcessingId(null);

    if (!result.ok) {
      setErrorMessage(result.error);
      return;
    }

    setStatusMessage(result.message);
    await loadEvents();
  }

  async function handleProcessPending() {
    setIsProcessingBatch(true);
    setErrorMessage(null);
    setStatusMessage(null);

    const result = await processPendingNotificationEvents({
      batchSize: 10,
      channel: channelFilter,
    });
    setIsProcessingBatch(false);

    if (!result.ok) {
      setErrorMessage(result.error);
      return;
    }

    if (result.summary) {
      setStatusMessage(
        `Processor handled ${result.summary.handledEventIds.length} events: ${result.summary.processed} processed, ${result.summary.skipped} skipped, ${result.summary.failed} failed.`,
      );
    } else {
      setStatusMessage(result.message);
    }

    await loadEvents();
  }

  return (
    <section className="page-section">
      <div className="page-heading-row">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>Notification Events</h1>
          <p>
            Monitor queued marketplace notification records and prepare failed events for backend
            retry.
          </p>
        </div>
        <div className="action-row">
          <button
            className="button primary"
            type="button"
            onClick={() => void handleProcessPending()}
            disabled={isProcessingBatch}
          >
            {isProcessingBatch ? "Processing..." : "Process pending notifications"}
          </button>
          <button className="button secondary" type="button" onClick={() => void loadEvents()}>
            Refresh
          </button>
        </div>
      </div>

      <div className="notice-card compliance-notice" role="note">
        Notification processing is a backend operation. Provider integrations should never run from
        the browser.
      </div>

      <div className="filter-row" role="group" aria-label="Filter notification events by status">
        {statusFilters.map((item) => (
          <button
            className={`filter-button${statusFilter === item.value ? " active" : ""}`}
            key={item.value}
            type="button"
            onClick={() => setStatusFilter(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="admin-filter-grid">
        <label>
          <span>Channel</span>
          <select
            value={channelFilter}
            onChange={(event) => setChannelFilter(event.target.value as ChannelFilter)}
          >
            {channelFilters.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Event type</span>
          <select
            value={eventTypeFilter}
            onChange={(event) => setEventTypeFilter(event.target.value as EventTypeFilter)}
          >
            {eventTypeFilters.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {isLoading ? <p>Loading notification events...</p> : null}
      {statusMessage ? <p className="form-message success">{statusMessage}</p> : null}
      {errorMessage ? <p className="form-message error">{errorMessage}</p> : null}
      {!isLoading && events.length === 0 ? <p>No notification events found.</p> : null}

      <div className="admin-card-list">
        {events.map((event) => (
          <article className="card admin-request-card" key={event.id}>
            <div className="request-card-header">
              <div>
                <p className="eyebrow">{formatDate(event.created_at)}</p>
                <h2>{formatLabel(event.event_type)}</h2>
                <p>
                  {formatLabel(event.entity_type)} | {event.entity_id}
                </p>
              </div>
              <span className={statusClass(event.status)}>{event.status}</span>
            </div>

            <dl className="agency-detail-grid">
              <div>
                <dt>Channel</dt>
                <dd>{event.channel}</dd>
              </div>
              <div>
                <dt>Recipient profile</dt>
                <dd>{event.recipient_profile_id || "None"}</dd>
              </div>
              <div>
                <dt>Phone / email</dt>
                <dd>
                  {[event.recipient_phone, event.recipient_email].filter(Boolean).join(" | ") ||
                    "None"}
                </dd>
              </div>
              <div>
                <dt>Retry count</dt>
                <dd>{event.retry_count || 0}</dd>
              </div>
              <div>
                <dt>Last attempt</dt>
                <dd>{formatDate(event.last_attempt_at)}</dd>
              </div>
              <div>
                <dt>Processed</dt>
                <dd>{formatDate(event.processed_at)}</dd>
              </div>
              {event.error_message ? (
                <div className="agency-review-notes">
                  <dt>Error</dt>
                  <dd>{event.error_message}</dd>
                </div>
              ) : null}
              {event.skipped_reason ? (
                <div className="agency-review-notes">
                  <dt>Skipped reason</dt>
                  <dd>{event.skipped_reason}</dd>
                </div>
              ) : null}
            </dl>

            <pre className="payload-preview">{formatPayload(event.payload)}</pre>

            <div className="action-row">
              {(event.status === "failed" || event.status === "skipped") && (
                <button
                  className="button primary"
                  type="button"
                  onClick={() => void handleRetry(event.id)}
                  disabled={processingId === event.id}
                >
                  {processingId === event.id ? "Retrying..." : "Retry"}
                </button>
              )}
              {(event.status === "pending" || event.status === "failed") && (
                <button
                  className="button secondary"
                  type="button"
                  onClick={() => void handleSkip(event.id)}
                  disabled={processingId === event.id}
                >
                  {processingId === event.id ? "Saving..." : "Mark skipped"}
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

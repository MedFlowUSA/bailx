import { useEffect, useState } from "react";
import { getRecentNotificationEvents } from "../lib/notificationEvents";
import type { NotificationEvent } from "../types";

type NotificationFilter = "all" | "pending" | "processed" | "failed" | "skipped";

const filters: { label: string; value: NotificationFilter }[] = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Processed", value: "processed" },
  { label: "Failed", value: "failed" },
  { label: "Skipped", value: "skipped" },
];

function formatPayload(payload: Record<string, unknown>) {
  const text = JSON.stringify(payload || {}, null, 2);
  return text.length > 260 ? `${text.slice(0, 260)}...` : text;
}

export function AdminNotificationsPage() {
  const [events, setEvents] = useState<NotificationEvent[]>([]);
  const [filter, setFilter] = useState<NotificationFilter>("pending");
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function loadEvents() {
    setIsLoading(true);
    setErrorMessage(null);

    const result = await getRecentNotificationEvents(100);
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
  }, []);

  const filteredEvents = events.filter((event) => {
    if (filter === "all") {
      return true;
    }

    return event.status === filter;
  });

  return (
    <section className="page-section">
      <div className="page-heading-row">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>Notification Events</h1>
          <p>Review queued marketplace notification records before sender integrations exist.</p>
        </div>
        <button className="button secondary" type="button" onClick={() => void loadEvents()}>
          Refresh
        </button>
      </div>

      <div className="filter-row" role="group" aria-label="Filter notification events">
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

      {isLoading ? <p>Loading notification events...</p> : null}
      {statusMessage ? <p className="form-message success">{statusMessage}</p> : null}
      {errorMessage ? <p className="form-message error">{errorMessage}</p> : null}
      {!isLoading && filteredEvents.length === 0 ? <p>No notification events found.</p> : null}

      <div className="admin-card-list">
        {filteredEvents.map((event) => (
          <article className="card admin-request-card" key={event.id}>
            <div className="request-card-header">
              <div>
                <p className="eyebrow">{new Date(event.created_at).toLocaleString()}</p>
                <h2>{event.event_type.replace(/_/g, " ")}</h2>
                <p>{event.entity_type.replace(/_/g, " ")} | {event.entity_id}</p>
              </div>
              <span className={event.status === "failed" ? "status-pill urgent" : "status-pill"}>
                {event.status}
              </span>
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
                <dt>Processed</dt>
                <dd>
                  {event.processed_at ? new Date(event.processed_at).toLocaleString() : "Pending"}
                </dd>
              </div>
              {event.error_message ? (
                <div className="agency-review-notes">
                  <dt>Error</dt>
                  <dd>{event.error_message}</dd>
                </div>
              ) : null}
            </dl>

            <pre className="payload-preview">{formatPayload(event.payload)}</pre>
          </article>
        ))}
      </div>
    </section>
  );
}

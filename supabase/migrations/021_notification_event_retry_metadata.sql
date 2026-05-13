-- Notification event retry metadata for backend sender worker readiness.

alter table public.notification_events
  add column if not exists retry_count integer not null default 0,
  add column if not exists last_attempt_at timestamptz,
  add column if not exists skipped_reason text;

create index if not exists notification_events_status_last_attempt_idx
  on public.notification_events (status, last_attempt_at desc);

comment on column public.notification_events.retry_count is
  'Number of admin or worker retry attempts for this notification event.';

comment on column public.notification_events.last_attempt_at is
  'Most recent backend processing or admin retry/skip action timestamp.';

comment on column public.notification_events.skipped_reason is
  'Reason a backend worker or admin skipped this queued notification event.';

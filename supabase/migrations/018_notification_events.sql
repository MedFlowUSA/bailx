-- BailX notification event foundation.
-- Stores durable event records for future SMS/email/in-app notification workers.
-- This migration does not add Twilio, email sending, or payment behavior.

create table if not exists public.notification_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  entity_type text not null,
  entity_id uuid not null,
  recipient_profile_id uuid references public.profiles(id) on delete set null,
  recipient_phone text,
  recipient_email text,
  channel text not null default 'in_app',
  status text not null default 'pending',
  payload jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'notification_events_event_type_check'
  ) then
    alter table public.notification_events
      add constraint notification_events_event_type_check
      check (event_type in (
        'bail_request_submitted',
        'agency_matched_to_request',
        'agency_offer_submitted',
        'provider_selected',
        'agency_application_submitted',
        'agency_approved',
        'agency_more_info_requested',
        'agency_rejected',
        'agency_document_uploaded',
        'agency_document_reviewed'
      ));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'notification_events_entity_type_check'
  ) then
    alter table public.notification_events
      add constraint notification_events_entity_type_check
      check (entity_type in ('agency', 'bail_request', 'agency_document', 'agency_offer', 'system'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'notification_events_channel_check'
  ) then
    alter table public.notification_events
      add constraint notification_events_channel_check
      check (channel in ('sms', 'email', 'in_app'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'notification_events_status_check'
  ) then
    alter table public.notification_events
      add constraint notification_events_status_check
      check (status in ('pending', 'processed', 'failed', 'skipped'));
  end if;
end;
$$;

create index if not exists idx_notification_events_status_created_at
on public.notification_events (status, created_at desc);

create index if not exists idx_notification_events_entity
on public.notification_events (entity_type, entity_id, created_at desc);

create index if not exists idx_notification_events_recipient_profile_id
on public.notification_events (recipient_profile_id, created_at desc);

alter table public.notification_events enable row level security;

comment on table public.notification_events is
  'Durable notification event queue for future SMS, email, and in-app notification workers.';

drop policy if exists "notification events admin select all" on public.notification_events;
drop policy if exists "notification events admin update all" on public.notification_events;
drop policy if exists "notification events recipient select own" on public.notification_events;
drop policy if exists "notification events app insert pending" on public.notification_events;

create policy "notification events admin select all"
on public.notification_events
for select
to authenticated
using (public.is_admin());

create policy "notification events admin update all"
on public.notification_events
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "notification events recipient select own"
on public.notification_events
for select
to authenticated
using (recipient_profile_id = public.current_profile_id());

create policy "notification events app insert pending"
on public.notification_events
for insert
to anon, authenticated
with check (
  status = 'pending'
  and processed_at is null
  and error_message is null
  and channel in ('sms', 'email', 'in_app')
);

comment on policy "notification events app insert pending" on public.notification_events is
  'Narrow client-side insert policy for current app flows. Future server workers should own event creation and delivery.';

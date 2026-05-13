-- BailX admin activity log foundation.
-- Extends admin_notes into a durable activity trail for compliance and
-- operational review while keeping access restricted to admins only.

alter table public.admin_notes
  add column if not exists entity_type text,
  add column if not exists entity_id uuid,
  add column if not exists note_type text,
  add column if not exists message text,
  add column if not exists created_by_profile_id uuid references public.profiles(id) on delete set null,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

update public.admin_notes
set
  entity_type = coalesce(
    entity_type,
    case nullif(related_table, '')
      when 'agencies' then 'agency'
      when 'agency_documents' then 'agency_document'
      when 'bail_requests' then 'bail_request'
      when 'agency_offers' then 'agency_offer'
      when 'agency' then 'agency'
      when 'agency_document' then 'agency_document'
      when 'bail_request' then 'bail_request'
      when 'agency_offer' then 'agency_offer'
      when 'system' then 'system'
      else 'system'
    end,
    'system'
  ),
  entity_id = coalesce(entity_id, related_id),
  note_type = coalesce(note_type, 'admin_note'),
  message = coalesce(message, note, ''),
  metadata = coalesce(metadata, '{}'::jsonb);

alter table public.admin_notes
  alter column entity_type set not null,
  alter column entity_type set default 'system',
  alter column note_type set not null,
  alter column note_type set default 'admin_note',
  alter column message set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'admin_notes_entity_type_check'
  ) then
    alter table public.admin_notes
      add constraint admin_notes_entity_type_check
      check (entity_type in ('agency', 'bail_request', 'agency_document', 'agency_offer', 'system'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'admin_notes_note_type_check'
  ) then
    alter table public.admin_notes
      add constraint admin_notes_note_type_check
      check (note_type in ('admin_note', 'status_change', 'document_review', 'provider_selection', 'compliance_review', 'system_event'));
  end if;
end;
$$;

create index if not exists idx_admin_notes_entity
on public.admin_notes (entity_type, entity_id, created_at desc);

create index if not exists idx_admin_notes_note_type
on public.admin_notes (note_type, created_at desc);

create index if not exists idx_admin_notes_created_by_profile_id
on public.admin_notes (created_by_profile_id);

comment on table public.admin_notes is
  'Durable admin notes and activity records for compliance and operational review.';

comment on column public.admin_notes.entity_type is
  'Type of entity the admin activity applies to: agency, bail_request, agency_document, agency_offer, or system.';

comment on column public.admin_notes.entity_id is
  'UUID of the related entity when the activity is entity-specific.';

comment on column public.admin_notes.note_type is
  'Activity category such as admin_note, status_change, document_review, provider_selection, compliance_review, or system_event.';

comment on column public.admin_notes.message is
  'Human-readable admin activity message.';

comment on column public.admin_notes.created_by_profile_id is
  'Admin profile that created the note or activity record.';

comment on column public.admin_notes.metadata is
  'Structured metadata for the admin activity record.';

drop policy if exists "admin notes admin select all" on public.admin_notes;
drop policy if exists "admin notes admin manage all" on public.admin_notes;
drop policy if exists "admin notes admin insert" on public.admin_notes;
drop policy if exists "admin notes admin update" on public.admin_notes;

create policy "admin notes admin select all"
on public.admin_notes
for select
to authenticated
using (public.is_admin());

create policy "admin notes admin insert"
on public.admin_notes
for insert
to authenticated
with check (public.is_admin());

create policy "admin notes admin update"
on public.admin_notes
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

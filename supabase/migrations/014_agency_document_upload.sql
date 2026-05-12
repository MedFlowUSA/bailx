-- BailX MVP agency document upload metadata and storage policy pass.
-- The agency-documents bucket is private. Verify Supabase Storage bucket/object
-- policies in the dashboard after applying this migration, especially if your
-- project manages Storage policies outside SQL migrations.

insert into storage.buckets (id, name, public)
values ('agency-documents', 'agency-documents', false)
on conflict (id) do update set public = false;

alter table public.agency_documents
  add column if not exists uploaded_by_profile_id uuid references public.profiles(id) on delete set null,
  add column if not exists file_name text,
  add column if not exists mime_type text,
  add column if not exists file_size bigint,
  add column if not exists review_status text not null default 'pending',
  add column if not exists admin_notes text,
  add column if not exists updated_at timestamptz not null default now();

update public.agency_documents
set review_status = coalesce(nullif(status, ''), review_status, 'pending')
where review_status is null or review_status = 'pending';

alter table public.agency_documents
drop constraint if exists agency_documents_review_status_check;

alter table public.agency_documents
add constraint agency_documents_review_status_check
check (review_status in ('pending', 'approved', 'rejected', 'more_info_requested'));

create index if not exists idx_agency_documents_agency_id
on public.agency_documents (agency_id);

create index if not exists idx_agency_documents_uploaded_by_profile_id
on public.agency_documents (uploaded_by_profile_id);

create index if not exists idx_agency_documents_review_status
on public.agency_documents (review_status);

drop policy if exists "agency documents admin select all" on public.agency_documents;
drop policy if exists "agency documents admin manage all" on public.agency_documents;
drop policy if exists "agency documents owner insert own agency" on public.agency_documents;
drop policy if exists "agency documents owner select own agency" on public.agency_documents;
drop policy if exists "agency documents admin select all metadata" on public.agency_documents;
drop policy if exists "agency documents admin update all metadata" on public.agency_documents;

create policy "agency documents owner insert own agency"
on public.agency_documents
for insert
to authenticated
with check (
  public.current_user_role() = 'agency'
  and uploaded_by_profile_id = public.current_profile_id()
  and review_status = 'pending'
  and exists (
    select 1
    from public.agencies
    where agencies.id = agency_documents.agency_id
      and agencies.owner_profile_id = public.current_profile_id()
  )
);

create policy "agency documents owner select own agency"
on public.agency_documents
for select
to authenticated
using (
  public.current_user_role() = 'agency'
  and exists (
    select 1
    from public.agencies
    where agencies.id = agency_documents.agency_id
      and agencies.owner_profile_id = public.current_profile_id()
  )
);

create policy "agency documents admin select all metadata"
on public.agency_documents
for select
to authenticated
using (public.is_admin());

create policy "agency documents admin update all metadata"
on public.agency_documents
for update
to authenticated
using (public.is_admin())
with check (
  public.is_admin()
  and review_status in ('pending', 'approved', 'rejected', 'more_info_requested')
);

drop policy if exists "agency documents owner storage insert" on storage.objects;
drop policy if exists "agency documents owner storage select" on storage.objects;
drop policy if exists "agency documents admin storage select" on storage.objects;

create policy "agency documents owner storage insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'agency-documents'
  and public.current_user_role() = 'agency'
  and exists (
    select 1
    from public.agencies
    where agencies.id::text = split_part(storage.objects.name, '/', 2)
      and agencies.owner_profile_id = public.current_profile_id()
  )
);

create policy "agency documents owner storage select"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'agency-documents'
  and public.current_user_role() = 'agency'
  and exists (
    select 1
    from public.agencies
    where agencies.id::text = split_part(storage.objects.name, '/', 2)
      and agencies.owner_profile_id = public.current_profile_id()
  )
);

create policy "agency documents admin storage select"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'agency-documents'
  and public.is_admin()
);

comment on table public.agency_documents is
  'Agency verification document metadata for private files in the agency-documents Supabase Storage bucket.';

comment on column public.agency_documents.review_status is
  'Admin review status for uploaded agency verification documents.';

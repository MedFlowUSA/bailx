-- Unclaimed provider directory metadata.
-- These records are for market coverage and admin outreach only. They are not
-- marketplace-approved agencies and must not receive live bail request details.

alter table public.agencies
  add column if not exists claimed_by_profile_id uuid references public.profiles(id) on delete set null,
  add column if not exists claimed_at timestamptz,
  add column if not exists source_type text,
  add column if not exists source_url text,
  add column if not exists public_listing_disclaimer text;

create index if not exists agencies_source_url_idx
  on public.agencies (source_url);

create index if not exists agencies_unclaimed_directory_idx
  on public.agencies (verification_status)
  where verification_status = 'unclaimed_directory';

drop policy if exists "agencies admin insert directory" on public.agencies;
create policy "agencies admin insert directory"
on public.agencies
for insert
to authenticated
with check (
  public.is_admin()
  and verification_status in ('unclaimed_directory', 'pending')
);

comment on column public.agencies.claimed_by_profile_id is
  'Profile that has started a future claim flow for a public directory listing. This does not imply approval.';

comment on column public.agencies.source_type is
  'Directory seed source category, such as public_website. Source metadata does not imply partnership or verification.';

comment on column public.agencies.source_url is
  'Public source URL used for basic factual directory seed metadata.';

comment on column public.agencies.public_listing_disclaimer is
  'Required disclaimer for unclaimed public listings.';

comment on table public.agencies is
  'Provider marketplace and directory records. verification_status = unclaimed_directory is outreach-only and not eligible for live request matching.';

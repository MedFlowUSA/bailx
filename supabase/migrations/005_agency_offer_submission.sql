-- BailX MVP agency offer submission pass.
-- Development-only access: agency offer insert/select is exposed to anon while
-- auth is not built. Replace with authenticated consumer/agency/admin RLS
-- before production so only eligible agencies can submit offers and only the
-- correct consumer, agency, or admin can view offer details.

alter table public.agency_offers
  add column if not exists bail_request_id uuid references public.bail_requests(id) on delete cascade,
  add column if not exists agency_id uuid references public.agencies(id) on delete cascade,
  add column if not exists down_payment numeric,
  add column if not exists estimated_release_time text,
  add column if not exists financing_available boolean,
  add column if not exists collateral_notes text,
  add column if not exists message text,
  add column if not exists status text default 'submitted',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.agency_offers
alter column status set default 'submitted';

update public.agency_offers
set status = 'submitted'
where status is null or status = 'sent';

create index if not exists idx_agency_offers_bail_request_id
on public.agency_offers (bail_request_id);

create index if not exists idx_agency_offers_agency_id
on public.agency_offers (agency_id);

create index if not exists idx_agency_offers_status
on public.agency_offers (status);

drop policy if exists "temporary dev anon agency offer insert" on public.agency_offers;
drop policy if exists "temporary dev anon agency offer select" on public.agency_offers;

create policy "temporary dev anon agency offer insert"
on public.agency_offers
for insert
to anon
with check (true);

create policy "temporary dev anon agency offer select"
on public.agency_offers
for select
to anon
using (true);

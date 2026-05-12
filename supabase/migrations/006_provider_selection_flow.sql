-- BailX MVP provider selection flow.
-- Development-only access: anon updates are allowed so the no-auth MVP can mark
-- an offer selected and move the bail request to provider_selected. Replace
-- these policies with authenticated role-based consumer/agency/admin RLS before
-- production.

alter table public.agency_offers
alter column status set default 'submitted';

update public.agency_offers
set status = 'submitted'
where status is null;

update public.agency_offers
set status = 'declined'
where status = 'not_selected';

update public.bail_requests
set status = 'submitted'
where status is null or status in ('draft', 'matched');

create index if not exists idx_agency_offers_request_status
on public.agency_offers (bail_request_id, status);

create index if not exists idx_bail_requests_status
on public.bail_requests (status);

drop policy if exists "temporary dev anon agency offer update" on public.agency_offers;
drop policy if exists "temporary dev anon bail request update" on public.bail_requests;

create policy "temporary dev anon agency offer update"
on public.agency_offers
for update
to anon
using (true)
with check (status in ('submitted', 'viewed', 'selected', 'declined', 'expired'));

create policy "temporary dev anon bail request update"
on public.bail_requests
for update
to anon
using (true)
with check (
  status in (
    'submitted',
    'providers_notified',
    'offers_received',
    'provider_selected',
    'closed',
    'cancelled'
  )
);

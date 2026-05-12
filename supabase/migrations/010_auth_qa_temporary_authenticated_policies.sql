-- BailX MVP auth QA temporary authenticated policies.
-- These keep the authenticated UI testable after Supabase Auth was added while
-- preserving anonymous emergency intake. Replace before production RLS lockdown.

drop policy if exists "temporary dev authenticated bail request insert" on public.bail_requests;
drop policy if exists "temporary dev authenticated bail request select" on public.bail_requests;
drop policy if exists "temporary dev authenticated bail request update" on public.bail_requests;
drop policy if exists "temporary dev authenticated agency offer insert" on public.agency_offers;
drop policy if exists "temporary dev authenticated agency offer select" on public.agency_offers;
drop policy if exists "temporary dev authenticated agency offer update" on public.agency_offers;
drop policy if exists "temporary dev authenticated approved agency select" on public.agencies;

create policy "temporary dev authenticated bail request insert"
on public.bail_requests
for insert
to authenticated
with check (
  consumer_profile_id is null
  or exists (
    select 1
    from public.profiles
    where profiles.id = bail_requests.consumer_profile_id
      and profiles.auth_user_id = auth.uid()
      and profiles.role = 'consumer'
  )
);

create policy "temporary dev authenticated bail request select"
on public.bail_requests
for select
to authenticated
using (true);

create policy "temporary dev authenticated bail request update"
on public.bail_requests
for update
to authenticated
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

create policy "temporary dev authenticated agency offer insert"
on public.agency_offers
for insert
to authenticated
with check (true);

create policy "temporary dev authenticated agency offer select"
on public.agency_offers
for select
to authenticated
using (true);

create policy "temporary dev authenticated agency offer update"
on public.agency_offers
for update
to authenticated
using (true)
with check (status in ('submitted', 'viewed', 'selected', 'declined', 'expired'));

create policy "temporary dev authenticated approved agency select"
on public.agencies
for select
to authenticated
using (verification_status = 'approved');

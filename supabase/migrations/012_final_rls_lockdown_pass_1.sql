-- BailX MVP final RLS lockdown pass 1.
-- This replaces broad development policies with role/ownership-based policies.
-- Anonymous emergency intake remains insert-only by design.

create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.profiles
  where auth_user_id = auth.uid()
  limit 1
$$;

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where auth_user_id = auth.uid()
  limit 1
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = 'admin', false)
$$;

create or replace function public.current_owned_agency_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.agencies
  where owner_profile_id = public.current_profile_id()
  order by created_at asc
  limit 1
$$;

create or replace function public.current_approved_agency_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.agencies
  where owner_profile_id = public.current_profile_id()
    and verification_status = 'approved'
  order by created_at asc
  limit 1
$$;

create or replace function public.prevent_non_admin_agency_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.verification_status is distinct from old.verification_status
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'Only admins may change agency verification_status.';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_non_admin_agency_status_change on public.agencies;
create trigger prevent_non_admin_agency_status_change
before update on public.agencies
for each row execute function public.prevent_non_admin_agency_status_change();

-- Remove broad and temporary development policies from prior MVP passes.
drop policy if exists "temporary dev anon profile select" on public.profiles;
drop policy if exists "temporary dev anon profile insert" on public.profiles;
drop policy if exists "temporary dev anon profile update" on public.profiles;

drop policy if exists "temporary anon bail request insert" on public.bail_requests;
drop policy if exists "temporary anon bail request select" on public.bail_requests;
drop policy if exists "temporary dev anon bail request update" on public.bail_requests;
drop policy if exists "temporary dev authenticated bail request insert" on public.bail_requests;
drop policy if exists "temporary dev authenticated bail request select" on public.bail_requests;
drop policy if exists "temporary dev authenticated bail request update" on public.bail_requests;

drop policy if exists "temporary anon agency insert" on public.agencies;
drop policy if exists "temporary anon pending agency select" on public.agencies;
drop policy if exists "temporary anon agency status update" on public.agencies;
drop policy if exists "temporary dev anon agency insert" on public.agencies;
drop policy if exists "temporary dev anon pending agency select" on public.agencies;
drop policy if exists "temporary dev anon agency status update" on public.agencies;
drop policy if exists "temporary dev anon approved agency select" on public.agencies;
drop policy if exists "temporary dev authenticated approved agency select" on public.agencies;
drop policy if exists "authenticated agency owner insert" on public.agencies;
drop policy if exists "authenticated agency owner select" on public.agencies;
drop policy if exists "authenticated admin agency review select" on public.agencies;
drop policy if exists "authenticated admin agency status update" on public.agencies;

drop policy if exists "temporary dev anon agency offer insert" on public.agency_offers;
drop policy if exists "temporary dev anon agency offer select" on public.agency_offers;
drop policy if exists "temporary dev anon agency offer update" on public.agency_offers;
drop policy if exists "temporary dev authenticated agency offer insert" on public.agency_offers;
drop policy if exists "temporary dev authenticated agency offer select" on public.agency_offers;
drop policy if exists "temporary dev authenticated agency offer update" on public.agency_offers;

-- Profiles: public signup can create non-admin profiles only after auth exists.
-- Client-side role changes are blocked by requiring role to remain equal to the
-- current stored role for self-updates. Admin role changes should eventually move
-- to a secure server-side provisioning function/RPC.
create policy "profiles authenticated insert own non-admin"
on public.profiles
for insert
to authenticated
with check (
  auth_user_id = auth.uid()
  and role in ('consumer', 'agency', 'attorney')
);

create policy "profiles authenticated select own"
on public.profiles
for select
to authenticated
using (id = public.current_profile_id());

create policy "profiles authenticated update own non-role"
on public.profiles
for update
to authenticated
using (id = public.current_profile_id())
with check (
  id = public.current_profile_id()
  and auth_user_id = auth.uid()
  and role = public.current_user_role()
);

create policy "profiles admin select all"
on public.profiles
for select
to authenticated
using (public.is_admin());

create policy "profiles admin update all"
on public.profiles
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Bail requests: anonymous users can submit emergency intake only. Tracking and
-- offer comparison require a linked consumer profile. Provider selection still
-- uses client-side updates in the MVP; replace with an RPC transaction next.
create policy "bail requests anon emergency insert"
on public.bail_requests
for insert
to anon
with check (
  consumer_profile_id is null
  and status = 'submitted'
);

create policy "bail requests consumer insert own"
on public.bail_requests
for insert
to authenticated
with check (
  public.current_user_role() = 'consumer'
  and consumer_profile_id = public.current_profile_id()
  and status = 'submitted'
);

create policy "bail requests consumer select own"
on public.bail_requests
for select
to authenticated
using (
  public.current_user_role() = 'consumer'
  and consumer_profile_id = public.current_profile_id()
);

create policy "bail requests consumer provider selection update"
on public.bail_requests
for update
to authenticated
using (
  public.current_user_role() = 'consumer'
  and consumer_profile_id = public.current_profile_id()
)
with check (
  public.current_user_role() = 'consumer'
  and consumer_profile_id = public.current_profile_id()
  and status = 'provider_selected'
);

create policy "bail requests eligible agency select"
on public.bail_requests
for select
to authenticated
using (
  public.current_user_role() = 'agency'
  and exists (
    select 1
    from public.agencies
    where agencies.owner_profile_id = public.current_profile_id()
      and agencies.verification_status = 'approved'
      and bail_requests.jail_county = any(coalesce(agencies.service_counties, '{}'::text[]))
  )
);

create policy "bail requests admin select all"
on public.bail_requests
for select
to authenticated
using (public.is_admin());

create policy "bail requests admin update all"
on public.bail_requests
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Agencies: agency users can submit and edit their own pending/info-requested
-- applications, but only admins can review or change verification_status.
create policy "agencies owner insert application"
on public.agencies
for insert
to authenticated
with check (
  public.current_user_role() = 'agency'
  and owner_profile_id = public.current_profile_id()
  and verification_status = 'pending'
);

create policy "agencies owner select own"
on public.agencies
for select
to authenticated
using (
  public.current_user_role() = 'agency'
  and owner_profile_id = public.current_profile_id()
);

create policy "agencies owner update pending fields"
on public.agencies
for update
to authenticated
using (
  public.current_user_role() = 'agency'
  and owner_profile_id = public.current_profile_id()
  and verification_status in ('pending', 'more_info_requested')
)
with check (
  public.current_user_role() = 'agency'
  and owner_profile_id = public.current_profile_id()
  and verification_status in ('pending', 'more_info_requested')
);

create policy "agencies consumer select offer agencies"
on public.agencies
for select
to authenticated
using (
  public.current_user_role() = 'consumer'
  and verification_status = 'approved'
  and exists (
    select 1
    from public.agency_offers
    join public.bail_requests
      on bail_requests.id = agency_offers.bail_request_id
    where agency_offers.agency_id = agencies.id
      and bail_requests.consumer_profile_id = public.current_profile_id()
  )
);

create policy "agencies admin select all"
on public.agencies
for select
to authenticated
using (public.is_admin());

create policy "agencies admin update all"
on public.agencies
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Agency offers: agency inserts are restricted to the signed-in user's own
-- approved agency. Consumer selection updates remain client-side for this MVP;
-- move selected/declined/request status changes into a single RPC transaction.
create policy "agency offers owner insert own approved agency"
on public.agency_offers
for insert
to authenticated
with check (
  public.current_user_role() = 'agency'
  and agency_id = public.current_approved_agency_id()
);

create policy "agency offers owner select own"
on public.agency_offers
for select
to authenticated
using (
  public.current_user_role() = 'agency'
  and exists (
    select 1
    from public.agencies
    where agencies.id = agency_offers.agency_id
      and agencies.owner_profile_id = public.current_profile_id()
  )
);

create policy "agency offers eligible agency select matched"
on public.agency_offers
for select
to authenticated
using (
  public.current_user_role() = 'agency'
  and exists (
    select 1
    from public.agencies
    join public.bail_requests
      on bail_requests.jail_county = any(coalesce(agencies.service_counties, '{}'::text[]))
    where agencies.owner_profile_id = public.current_profile_id()
      and agencies.verification_status = 'approved'
      and bail_requests.id = agency_offers.bail_request_id
  )
);

create policy "agency offers consumer select own request offers"
on public.agency_offers
for select
to authenticated
using (
  public.current_user_role() = 'consumer'
  and exists (
    select 1
    from public.bail_requests
    where bail_requests.id = agency_offers.bail_request_id
      and bail_requests.consumer_profile_id = public.current_profile_id()
  )
);

create policy "agency offers consumer provider selection update"
on public.agency_offers
for update
to authenticated
using (
  public.current_user_role() = 'consumer'
  and exists (
    select 1
    from public.bail_requests
    where bail_requests.id = agency_offers.bail_request_id
      and bail_requests.consumer_profile_id = public.current_profile_id()
  )
)
with check (
  public.current_user_role() = 'consumer'
  and status in ('selected', 'declined')
  and exists (
    select 1
    from public.bail_requests
    where bail_requests.id = agency_offers.bail_request_id
      and bail_requests.consumer_profile_id = public.current_profile_id()
  )
);

create policy "agency offers admin select all"
on public.agency_offers
for select
to authenticated
using (public.is_admin());

create policy "agency offers admin update all"
on public.agency_offers
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Conservative supporting-table lockdown. These are not full marketplace
-- features yet, so writes stay admin-only unless explicitly noted.
create policy "agency documents admin select all"
on public.agency_documents
for select
to authenticated
using (public.is_admin());

create policy "agency documents admin manage all"
on public.agency_documents
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "reviews admin select all"
on public.reviews
for select
to authenticated
using (public.is_admin());

create policy "reviews admin manage all"
on public.reviews
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "subscriptions admin select all"
on public.subscriptions
for select
to authenticated
using (public.is_admin());

create policy "subscriptions admin manage all"
on public.subscriptions
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "attorney ads public active select"
on public.attorney_ads
for select
to anon, authenticated
using (status = 'active');

create policy "attorney ads admin manage all"
on public.attorney_ads
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "admin notes admin select all"
on public.admin_notes
for select
to authenticated
using (public.is_admin());

create policy "admin notes admin manage all"
on public.admin_notes
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

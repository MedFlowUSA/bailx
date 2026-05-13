-- Consumer-private offer notes and safe agency profile self-edit RPC.

create table if not exists public.customer_offer_notes (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.agency_offers(id) on delete cascade,
  bail_request_id uuid not null references public.bail_requests(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_offer_notes_offer_profile_unique unique (offer_id, profile_id)
);

alter table public.customer_offer_notes enable row level security;

drop policy if exists "customer offer notes consumer select own" on public.customer_offer_notes;
create policy "customer offer notes consumer select own"
on public.customer_offer_notes
for select
to authenticated
using (
  profile_id = public.current_profile_id()
  and exists (
    select 1
    from public.bail_requests
    where bail_requests.id = customer_offer_notes.bail_request_id
      and bail_requests.consumer_profile_id = public.current_profile_id()
  )
);

drop policy if exists "customer offer notes consumer insert own" on public.customer_offer_notes;
create policy "customer offer notes consumer insert own"
on public.customer_offer_notes
for insert
to authenticated
with check (
  profile_id = public.current_profile_id()
  and exists (
    select 1
    from public.bail_requests
    where bail_requests.id = customer_offer_notes.bail_request_id
      and bail_requests.consumer_profile_id = public.current_profile_id()
  )
  and exists (
    select 1
    from public.agency_offers
    where agency_offers.id = customer_offer_notes.offer_id
      and agency_offers.bail_request_id = customer_offer_notes.bail_request_id
  )
);

drop policy if exists "customer offer notes consumer update own" on public.customer_offer_notes;
create policy "customer offer notes consumer update own"
on public.customer_offer_notes
for update
to authenticated
using (profile_id = public.current_profile_id())
with check (profile_id = public.current_profile_id());

drop policy if exists "customer offer notes admin select all" on public.customer_offer_notes;
create policy "customer offer notes admin select all"
on public.customer_offer_notes
for select
to authenticated
using (public.is_admin());

create or replace function public.touch_customer_offer_notes_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_customer_offer_notes_updated_at on public.customer_offer_notes;
create trigger touch_customer_offer_notes_updated_at
before update on public.customer_offer_notes
for each row
execute function public.touch_customer_offer_notes_updated_at();

create or replace function public.update_own_agency_profile(
  p_agency_id uuid,
  p_business_name text,
  p_contact_name text,
  p_phone text,
  p_email text,
  p_service_counties text[],
  p_languages text[],
  p_collateral_accepted text[],
  p_subscription_tier text
)
returns public.agencies
language plpgsql
security definer
set search_path = public
as $$
declare
  v_agency public.agencies%rowtype;
begin
  update public.agencies
  set
    business_name = nullif(trim(p_business_name), ''),
    contact_name = nullif(trim(p_contact_name), ''),
    phone = nullif(trim(p_phone), ''),
    email = nullif(trim(p_email), ''),
    service_counties = coalesce(p_service_counties, '{}'::text[]),
    languages = coalesce(p_languages, '{}'::text[]),
    collateral_accepted = coalesce(p_collateral_accepted, '{}'::text[]),
    subscription_tier = nullif(trim(p_subscription_tier), ''),
    updated_at = now()
  where id = p_agency_id
    and owner_profile_id = public.current_profile_id()
  returning * into v_agency;

  if not found then
    raise exception 'Agency profile not found or not owned by current agency user.';
  end if;

  return v_agency;
end;
$$;

comment on table public.customer_offer_notes is
  'Private consumer notes for comparing provider offers. Agencies cannot view this table.';

comment on function public.update_own_agency_profile is
  'Allows an agency user to update profile fields for their own agency without changing verification status or admin review fields.';

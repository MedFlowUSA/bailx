-- Customer-owned request checklist tasks and safe request packet updates.

create table if not exists public.customer_request_tasks (
  id uuid primary key default gen_random_uuid(),
  bail_request_id uuid not null references public.bail_requests(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  task_key text not null,
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_request_tasks_key_check
    check (task_key in ('provider_contacted', 'terms_confirmed', 'documents_ready', 'family_notified')),
  constraint customer_request_tasks_unique unique (bail_request_id, profile_id, task_key)
);

alter table public.customer_request_tasks enable row level security;

drop policy if exists "customer request tasks consumer select own" on public.customer_request_tasks;
create policy "customer request tasks consumer select own"
on public.customer_request_tasks
for select
to authenticated
using (
  profile_id = public.current_profile_id()
  and exists (
    select 1
    from public.bail_requests
    where bail_requests.id = customer_request_tasks.bail_request_id
      and bail_requests.consumer_profile_id = public.current_profile_id()
  )
);

drop policy if exists "customer request tasks consumer insert own" on public.customer_request_tasks;
create policy "customer request tasks consumer insert own"
on public.customer_request_tasks
for insert
to authenticated
with check (
  profile_id = public.current_profile_id()
  and exists (
    select 1
    from public.bail_requests
    where bail_requests.id = customer_request_tasks.bail_request_id
      and bail_requests.consumer_profile_id = public.current_profile_id()
  )
);

drop policy if exists "customer request tasks consumer update own" on public.customer_request_tasks;
create policy "customer request tasks consumer update own"
on public.customer_request_tasks
for update
to authenticated
using (profile_id = public.current_profile_id())
with check (profile_id = public.current_profile_id());

drop policy if exists "customer request tasks admin select all" on public.customer_request_tasks;
create policy "customer request tasks admin select all"
on public.customer_request_tasks
for select
to authenticated
using (public.is_admin());

create or replace function public.touch_customer_request_tasks_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  if new.completed and old.completed is distinct from true then
    new.completed_at = now();
  elsif not new.completed then
    new.completed_at = null;
  end if;
  return new;
end;
$$;

drop trigger if exists touch_customer_request_tasks_updated_at on public.customer_request_tasks;
create trigger touch_customer_request_tasks_updated_at
before update on public.customer_request_tasks
for each row
execute function public.touch_customer_request_tasks_updated_at();

create or replace function public.update_own_bail_request_packet(
  p_request_id uuid,
  p_jail_location text,
  p_jail_city text,
  p_jail_county text,
  p_jail_state text,
  p_jail_zip text,
  p_bond_amount numeric,
  p_charges text,
  p_preferred_language text,
  p_collateral_available text[],
  p_notes text,
  p_has_crypto_collateral boolean,
  p_crypto_assets text[],
  p_estimated_crypto_value text,
  p_crypto_wallet_type text,
  p_willing_to_convert_to_stablecoin boolean,
  p_preferred_stablecoin text,
  p_crypto_collateral_notes text,
  p_crypto_collateral_acknowledged boolean
)
returns public.bail_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.bail_requests%rowtype;
begin
  update public.bail_requests
  set
    jail_location = nullif(trim(p_jail_location), ''),
    jail_city = nullif(trim(p_jail_city), ''),
    jail_county = nullif(trim(p_jail_county), ''),
    jail_state = nullif(upper(trim(p_jail_state)), ''),
    jail_zip = nullif(trim(p_jail_zip), ''),
    bond_amount = p_bond_amount,
    charges = nullif(trim(p_charges), ''),
    preferred_language = nullif(trim(p_preferred_language), ''),
    collateral_available = coalesce(p_collateral_available, '{}'::text[]),
    notes = nullif(trim(p_notes), ''),
    has_crypto_collateral = coalesce(p_has_crypto_collateral, false),
    crypto_assets = case when coalesce(p_has_crypto_collateral, false) then coalesce(p_crypto_assets, '{}'::text[]) else null end,
    estimated_crypto_value = case when coalesce(p_has_crypto_collateral, false) then nullif(trim(p_estimated_crypto_value), '') else null end,
    crypto_wallet_type = case when coalesce(p_has_crypto_collateral, false) then nullif(trim(p_crypto_wallet_type), '') else null end,
    willing_to_convert_to_stablecoin = case when coalesce(p_has_crypto_collateral, false) then coalesce(p_willing_to_convert_to_stablecoin, false) else false end,
    preferred_stablecoin = case when coalesce(p_has_crypto_collateral, false) then nullif(trim(p_preferred_stablecoin), '') else null end,
    crypto_collateral_notes = case when coalesce(p_has_crypto_collateral, false) then nullif(trim(p_crypto_collateral_notes), '') else null end,
    crypto_collateral_acknowledged = case when coalesce(p_has_crypto_collateral, false) then coalesce(p_crypto_collateral_acknowledged, false) else false end,
    crypto_collateral_acknowledged_at = case
      when coalesce(p_has_crypto_collateral, false) and coalesce(p_crypto_collateral_acknowledged, false)
        then coalesce(crypto_collateral_acknowledged_at, now())
      else null
    end,
    updated_at = now()
  where id = p_request_id
    and consumer_profile_id = public.current_profile_id()
  returning * into v_request;

  if not found then
    raise exception 'Request not found or not owned by current consumer.';
  end if;

  return v_request;
end;
$$;

comment on table public.customer_request_tasks is
  'Private consumer checklist state for request preparation. Agencies cannot view this table.';

comment on function public.update_own_bail_request_packet is
  'Allows a consumer to update non-identity request packet fields for their own bail request only.';

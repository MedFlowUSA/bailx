-- BailX MVP secure provider selection RPC.
-- Consumers select a provider through this single transaction instead of
-- performing multi-step client-side updates. The function is SECURITY DEFINER
-- so it can perform the coordinated writes while enforcing ownership/admin
-- authorization internally. Anonymous callers are not granted execute access.

drop policy if exists "agency offers consumer provider selection update" on public.agency_offers;
drop policy if exists "bail requests consumer provider selection update" on public.bail_requests;

create or replace function public.select_provider_offer(p_offer_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_profile_id uuid;
  v_is_admin boolean;
  v_offer public.agency_offers%rowtype;
  v_request public.bail_requests%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.'
      using errcode = '28000';
  end if;

  v_profile_id := public.current_profile_id();
  v_is_admin := public.is_admin();

  if v_profile_id is null and not v_is_admin then
    raise exception 'No BailX profile is linked to this account.'
      using errcode = '28000';
  end if;

  select *
  into v_offer
  from public.agency_offers
  where id = p_offer_id
  for update;

  if not found then
    raise exception 'Agency offer not found.'
      using errcode = 'P0002';
  end if;

  select *
  into v_request
  from public.bail_requests
  where id = v_offer.bail_request_id
  for update;

  if not found then
    raise exception 'Bail request not found.'
      using errcode = 'P0002';
  end if;

  if not (
    v_is_admin
    or v_request.consumer_profile_id = v_profile_id
  ) then
    raise exception 'You are not allowed to select this provider offer.'
      using errcode = '42501';
  end if;

  update public.agency_offers
  set
    status = case
      when id = p_offer_id then 'selected'
      else 'declined'
    end,
    updated_at = now()
  where bail_request_id = v_offer.bail_request_id;

  update public.bail_requests
  set
    status = 'provider_selected',
    updated_at = now()
  where id = v_offer.bail_request_id;

  return jsonb_build_object(
    'offer_id', p_offer_id,
    'bail_request_id', v_offer.bail_request_id,
    'status', 'selected'
  );
end;
$$;

comment on function public.select_provider_offer(uuid) is
  'Atomically selects one agency offer, declines competing offers, and marks the bail request provider_selected. Authenticated consumers may select offers for their own bail requests; admins may select for any request.';

revoke all on function public.select_provider_offer(uuid) from public;
revoke all on function public.select_provider_offer(uuid) from anon;
grant execute on function public.select_provider_offer(uuid) to authenticated;

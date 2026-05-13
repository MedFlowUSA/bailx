-- BailX agency match dispatch RPC.
-- Creates idempotent agency_matched_to_request events and advances the request
-- to providers_notified without granting broad client-side request updates.

create unique index if not exists idx_notification_events_agency_match_unique
on public.notification_events (
  entity_id,
  coalesce(
    recipient_profile_id::text,
    payload ->> 'agency_id',
    recipient_email,
    recipient_phone,
    ''
  )
)
where event_type = 'agency_matched_to_request'
  and entity_type = 'bail_request';

create or replace function public.dispatch_agency_matches(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_request public.bail_requests%rowtype;
  v_matched_count integer := 0;
  v_inserted_count integer := 0;
begin
  select *
  into v_request
  from public.bail_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Bail request not found.'
      using errcode = 'P0002';
  end if;

  if v_request.status not in ('submitted', 'providers_notified') then
    return jsonb_build_object(
      'request_id', p_request_id,
      'matched_count', 0,
      'inserted_count', 0,
      'status', v_request.status
    );
  end if;

  if v_request.jail_county is null or btrim(v_request.jail_county) = '' then
    return jsonb_build_object(
      'request_id', p_request_id,
      'matched_count', 0,
      'inserted_count', 0,
      'status', v_request.status
    );
  end if;

  select count(*)
  into v_matched_count
  from public.agencies
  where verification_status = 'approved'
    and v_request.jail_county = any(coalesce(service_counties, '{}'::text[]));

  insert into public.notification_events (
    event_type,
    entity_type,
    entity_id,
    recipient_profile_id,
    recipient_phone,
    recipient_email,
    channel,
    status,
    payload
  )
  select
    'agency_matched_to_request',
    'bail_request',
    v_request.id,
    agencies.owner_profile_id,
    agencies.phone,
    agencies.email,
    'in_app',
    'pending',
    jsonb_build_object(
      'agency_id', agencies.id,
      'business_name', agencies.business_name,
      'jail_county', v_request.jail_county,
      'urgency_level', v_request.urgency_level,
      'preferred_language', v_request.preferred_language,
      'match_reason', 'County match: ' || v_request.jail_county
    )
  from public.agencies
  where agencies.verification_status = 'approved'
    and v_request.jail_county = any(coalesce(agencies.service_counties, '{}'::text[]))
  on conflict do nothing;

  get diagnostics v_inserted_count = row_count;

  if v_matched_count > 0 and v_request.status = 'submitted' then
    update public.bail_requests
    set
      status = 'providers_notified',
      updated_at = now()
    where id = p_request_id;
  end if;

  return jsonb_build_object(
    'request_id', p_request_id,
    'matched_count', v_matched_count,
    'inserted_count', v_inserted_count,
    'status', case when v_matched_count > 0 then 'providers_notified' else v_request.status end
  );
end;
$$;

comment on function public.dispatch_agency_matches(uuid) is
  'Finds approved agencies by request county, queues idempotent match events, and marks the request providers_notified.';

revoke all on function public.dispatch_agency_matches(uuid) from public;
grant execute on function public.dispatch_agency_matches(uuid) to anon, authenticated;

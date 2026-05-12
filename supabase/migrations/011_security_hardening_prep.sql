-- BailX MVP security hardening prep.
-- This migration adds lookup indexes used by ownership-based access patterns.
-- Final RLS lockdown will replace the remaining temporary anon/authenticated
-- development policies after the app paths are verified end to end.

create index if not exists idx_bail_requests_consumer_profile_id
on public.bail_requests (consumer_profile_id);

create index if not exists idx_agencies_owner_profile_id
on public.agencies (owner_profile_id);

create index if not exists idx_profiles_auth_user_id_hardening
on public.profiles (auth_user_id);

create index if not exists idx_profiles_role
on public.profiles (role);

create index if not exists idx_agency_offers_agency_id
on public.agency_offers (agency_id);

create index if not exists idx_agency_offers_bail_request_id
on public.agency_offers (bail_request_id);

comment on table public.profiles is
  'BailX user profiles. Admin roles must be manually provisioned during development or created through a secure server-side flow before production.';

comment on table public.bail_requests is
  'Emergency bail requests. Anonymous insert remains public for intake; authenticated request reads should be restricted by consumer_profile_id or admin role in final RLS.';

comment on table public.agencies is
  'Agency applications and provider profiles. Final RLS should restrict owner writes to linked agency users and review actions to admins.';

comment on table public.agency_offers is
  'Agency offers. Final RLS should restrict inserts to approved linked agencies and reads/selection to the owning consumer, linked agency, or admin.';

-- BailX MVP authenticated agency onboarding policies.
-- Agency signup now uses Supabase Auth, so agency application writes run as the
-- authenticated PostgREST role rather than anon.

drop policy if exists "authenticated agency owner insert" on public.agencies;
drop policy if exists "authenticated agency owner select" on public.agencies;
drop policy if exists "authenticated admin agency review select" on public.agencies;
drop policy if exists "authenticated admin agency status update" on public.agencies;

create policy "authenticated agency owner insert"
on public.agencies
for insert
to authenticated
with check (
  verification_status = 'pending'
  and exists (
    select 1
    from public.profiles
    where profiles.id = agencies.owner_profile_id
      and profiles.auth_user_id = auth.uid()
      and profiles.role = 'agency'
  )
);

create policy "authenticated agency owner select"
on public.agencies
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = agencies.owner_profile_id
      and profiles.auth_user_id = auth.uid()
      and profiles.role = 'agency'
  )
);

create policy "authenticated admin agency review select"
on public.agencies
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.auth_user_id = auth.uid()
      and profiles.role = 'admin'
  )
);

create policy "authenticated admin agency status update"
on public.agencies
for update
to authenticated
using (
  verification_status = 'pending'
  and exists (
    select 1
    from public.profiles
    where profiles.auth_user_id = auth.uid()
      and profiles.role = 'admin'
  )
)
with check (
  verification_status in ('approved', 'rejected', 'more_info_requested')
  and exists (
    select 1
    from public.profiles
    where profiles.auth_user_id = auth.uid()
      and profiles.role = 'admin'
  )
);

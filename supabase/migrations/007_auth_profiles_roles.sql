-- BailX MVP Supabase Auth foundation.
-- This migration prepares profiles, account roles, and ownership links while
-- keeping RLS changes minimal. Final RLS lockdown should happen only after the
-- auth UI and role routing are verified end to end.

alter table public.profiles
  add column if not exists auth_user_id uuid,
  add column if not exists full_name text,
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists role text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.agencies
  add column if not exists owner_profile_id uuid references public.profiles(id) on delete set null;

alter table public.bail_requests
  add column if not exists consumer_profile_id uuid references public.profiles(id) on delete set null;

create unique index if not exists idx_profiles_auth_user_id
on public.profiles (auth_user_id)
where auth_user_id is not null;

create index if not exists idx_profiles_role
on public.profiles (role);

create index if not exists idx_agencies_owner_profile_id
on public.agencies (owner_profile_id);

create index if not exists idx_bail_requests_consumer_profile_id
on public.bail_requests (consumer_profile_id);

drop policy if exists "temporary dev anon profile select" on public.profiles;
drop policy if exists "temporary dev anon profile insert" on public.profiles;
drop policy if exists "temporary dev anon profile update" on public.profiles;

-- Development-only profile policies for auth UI verification. Replace with
-- authenticated role-based profile policies before production.
create policy "temporary dev anon profile select"
on public.profiles
for select
to anon, authenticated
using (true);

create policy "temporary dev anon profile insert"
on public.profiles
for insert
to anon, authenticated
with check (role in ('consumer', 'agency', 'admin', 'attorney'));

create policy "temporary dev anon profile update"
on public.profiles
for update
to anon, authenticated
using (true)
with check (role in ('consumer', 'agency', 'admin', 'attorney'));

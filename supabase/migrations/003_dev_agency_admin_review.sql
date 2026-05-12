-- BailX MVP agency onboarding/admin review development policy pass.
-- These policies are development-only. Before production, replace them with
-- authenticated provider/admin RLS so only agency owners can submit/update
-- their agency records and only verified admins can approve, reject, or request
-- more information.

alter table public.agencies
  add column if not exists business_name text,
  add column if not exists contact_name text,
  add column if not exists phone text,
  add column if not exists email text,
  add column if not exists license_number text,
  add column if not exists service_counties text[] default '{}',
  add column if not exists languages text[] default '{}',
  add column if not exists collateral_accepted text[] default '{}',
  add column if not exists verification_status text not null default 'pending',
  add column if not exists subscription_tier text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

update public.agencies
set verification_status = 'approved'
where verification_status = 'verified';

update public.agencies
set verification_status = 'more_info_requested'
where verification_status = 'needs_info';

drop policy if exists "temporary anon agency insert" on public.agencies;
drop policy if exists "temporary anon pending agency select" on public.agencies;
drop policy if exists "temporary anon agency status update" on public.agencies;
drop policy if exists "temporary dev anon agency insert" on public.agencies;
drop policy if exists "temporary dev anon pending agency select" on public.agencies;
drop policy if exists "temporary dev anon agency status update" on public.agencies;

create policy "temporary dev anon agency insert"
on public.agencies
for insert
to anon
with check (true);

create policy "temporary dev anon pending agency select"
on public.agencies
for select
to anon
using (verification_status = 'pending');

create policy "temporary dev anon agency status update"
on public.agencies
for update
to anon
using (verification_status = 'pending')
with check (verification_status in ('approved', 'rejected', 'more_info_requested'));

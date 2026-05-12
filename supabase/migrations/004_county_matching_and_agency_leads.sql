-- BailX MVP county matching and agency lead inbox pass.
-- Development-only access: approved agency and bail request reads are exposed
-- to anon while auth is not built. Replace with authenticated provider/admin
-- policies before production.

alter table public.bail_requests
  add column if not exists jail_city text,
  add column if not exists jail_county text,
  add column if not exists jail_state text,
  add column if not exists jail_zip text;

drop policy if exists "temporary dev anon approved agency select" on public.agencies;
create policy "temporary dev anon approved agency select"
on public.agencies
for select
to anon
using (verification_status = 'approved');

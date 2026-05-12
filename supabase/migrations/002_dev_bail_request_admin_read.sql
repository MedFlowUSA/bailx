-- Temporary development policy for the admin bail request queue while auth is
-- not built yet. Tighten before production so only authenticated admins can
-- read bail request details.

drop policy if exists "temporary anon bail request select" on public.bail_requests;
create policy "temporary anon bail request select"
on public.bail_requests
for select
to anon
using (true);

-- BailX emergency intake RLS fix.
-- Anonymous emergency intake is insert-only. Authenticated non-consumer users
-- may also use the public intake path, but those requests are not linked to a
-- consumer dashboard unless the signed-in profile role is consumer.

drop policy if exists "bail requests authenticated emergency insert" on public.bail_requests;

create policy "bail requests authenticated emergency insert"
on public.bail_requests
for insert
to authenticated
with check (
  consumer_profile_id is null
  and status = 'submitted'
  and coalesce(public.current_user_role(), '') <> 'consumer'
);

comment on policy "bail requests authenticated emergency insert" on public.bail_requests is
  'Allows signed-in non-consumer accounts to submit public emergency intake without granting request read access. Consumer accounts use the linked consumer insert policy.';

-- BailX agency review audit metadata.
-- Adds durable admin decision fields for compliance/admin tracking without
-- weakening the existing role-based RLS policies.

alter table public.agencies
  add column if not exists reviewed_by_profile_id uuid references public.profiles(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists review_notes text,
  add column if not exists previous_verification_status text;

create index if not exists idx_agencies_reviewed_by_profile_id
on public.agencies (reviewed_by_profile_id);

create index if not exists idx_agencies_reviewed_at
on public.agencies (reviewed_at);

comment on column public.agencies.reviewed_by_profile_id is
  'Admin profile that last made an agency verification decision; used for compliance/admin decision tracking.';

comment on column public.agencies.reviewed_at is
  'Timestamp of the last agency verification decision; used for compliance/admin decision tracking.';

comment on column public.agencies.review_notes is
  'Optional admin reason or note captured with the last agency verification decision.';

comment on column public.agencies.previous_verification_status is
  'Agency verification status before the last admin decision; used for compliance/admin decision tracking.';

create or replace function public.prevent_non_admin_agency_review_metadata_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null
     and not public.is_admin()
     and (
       new.reviewed_by_profile_id is distinct from old.reviewed_by_profile_id
       or new.reviewed_at is distinct from old.reviewed_at
       or new.review_notes is distinct from old.review_notes
       or new.previous_verification_status is distinct from old.previous_verification_status
     ) then
    raise exception 'Only admins may change agency review metadata.';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_non_admin_agency_review_metadata_change on public.agencies;
create trigger prevent_non_admin_agency_review_metadata_change
before update on public.agencies
for each row execute function public.prevent_non_admin_agency_review_metadata_change();

-- BailX MVP auth profile uniqueness fix.
-- This supports reliable profile creation for Supabase Auth users. RLS remains
-- intentionally permissive from prior development migrations until auth UI is
-- verified and final role-based policies are implemented.

drop index if exists public.idx_profiles_auth_user_id;

alter table public.profiles
drop constraint if exists profiles_auth_user_id_key;

alter table public.profiles
add constraint profiles_auth_user_id_key unique (auth_user_id);

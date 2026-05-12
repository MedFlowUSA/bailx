-- BailX MVP initial schema.
-- This schema is intentionally flexible for the first development pass.
-- RLS policies below are temporary development placeholders and must be
-- tightened before production.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  full_name text,
  phone text,
  email text,
  role text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agencies (
  id uuid primary key default gen_random_uuid(),
  business_name text,
  contact_name text,
  phone text,
  email text,
  license_number text,
  service_counties text[] default '{}',
  languages text[] default '{}',
  collateral_accepted text[] default '{}',
  verification_status text not null default 'pending',
  subscription_tier text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agency_documents (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid references public.agencies(id) on delete cascade,
  document_type text,
  file_path text,
  status text default 'pending',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bail_requests (
  id uuid primary key default gen_random_uuid(),
  requester_name text,
  requester_phone text,
  requester_email text,
  defendant_name text,
  jail_location text,
  bond_amount numeric,
  charges text,
  urgency_level text,
  preferred_language text,
  collateral_available text[] default '{}',
  notes text,
  status text not null default 'submitted',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agency_offers (
  id uuid primary key default gen_random_uuid(),
  bail_request_id uuid references public.bail_requests(id) on delete cascade,
  agency_id uuid references public.agencies(id) on delete cascade,
  down_payment numeric,
  estimated_release_time text,
  financing_available boolean,
  collateral_notes text,
  message text,
  status text default 'sent',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid references public.agencies(id) on delete cascade,
  bail_request_id uuid references public.bail_requests(id) on delete set null,
  reviewer_name text,
  rating integer,
  comment text,
  status text default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid references public.agencies(id) on delete cascade,
  tier text,
  status text default 'inactive',
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.attorney_ads (
  id uuid primary key default gen_random_uuid(),
  advertiser_name text,
  contact_name text,
  phone text,
  email text,
  website_url text,
  practice_areas text[] default '{}',
  jurisdictions text[] default '{}',
  status text default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_notes (
  id uuid primary key default gen_random_uuid(),
  related_table text,
  related_id uuid,
  note text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_agencies_updated_at on public.agencies;
create trigger set_agencies_updated_at
before update on public.agencies
for each row execute function public.set_updated_at();

drop trigger if exists set_agency_documents_updated_at on public.agency_documents;
create trigger set_agency_documents_updated_at
before update on public.agency_documents
for each row execute function public.set_updated_at();

drop trigger if exists set_bail_requests_updated_at on public.bail_requests;
create trigger set_bail_requests_updated_at
before update on public.bail_requests
for each row execute function public.set_updated_at();

drop trigger if exists set_agency_offers_updated_at on public.agency_offers;
create trigger set_agency_offers_updated_at
before update on public.agency_offers
for each row execute function public.set_updated_at();

drop trigger if exists set_reviews_updated_at on public.reviews;
create trigger set_reviews_updated_at
before update on public.reviews
for each row execute function public.set_updated_at();

drop trigger if exists set_subscriptions_updated_at on public.subscriptions;
create trigger set_subscriptions_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at();

drop trigger if exists set_attorney_ads_updated_at on public.attorney_ads;
create trigger set_attorney_ads_updated_at
before update on public.attorney_ads
for each row execute function public.set_updated_at();

drop trigger if exists set_admin_notes_updated_at on public.admin_notes;
create trigger set_admin_notes_updated_at
before update on public.admin_notes
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.agencies enable row level security;
alter table public.agency_documents enable row level security;
alter table public.bail_requests enable row level security;
alter table public.agency_offers enable row level security;
alter table public.reviews enable row level security;
alter table public.subscriptions enable row level security;
alter table public.attorney_ads enable row level security;
alter table public.admin_notes enable row level security;

-- Temporary development policy: anonymous users can submit emergency intake
-- requests only. Tighten this before production with auth, validation, rate
-- limiting, and provider/admin-specific access policies.
drop policy if exists "temporary anon bail request insert" on public.bail_requests;
create policy "temporary anon bail request insert"
on public.bail_requests
for insert
to anon
with check (true);

-- Temporary development policies for agency onboarding and admin review while
-- auth is not built yet. Tighten before production so only agency owners can
-- create/update their records and only admins can verify providers.
drop policy if exists "temporary anon agency insert" on public.agencies;
create policy "temporary anon agency insert"
on public.agencies
for insert
to anon
with check (true);

drop policy if exists "temporary anon pending agency select" on public.agencies;
create policy "temporary anon pending agency select"
on public.agencies
for select
to anon
using (verification_status = 'pending');

drop policy if exists "temporary anon agency status update" on public.agencies;
create policy "temporary anon agency status update"
on public.agencies
for update
to anon
using (verification_status = 'pending')
with check (verification_status in ('verified', 'needs_info', 'rejected'));

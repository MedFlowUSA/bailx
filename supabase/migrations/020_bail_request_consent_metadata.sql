-- BailX bail request consent metadata.
-- Captures required marketplace/legal disclosure acknowledgements at intake.

alter table public.bail_requests
  add column if not exists consent_marketplace_share boolean not null default false,
  add column if not exists consent_no_legal_advice boolean not null default false,
  add column if not exists consent_terms_privacy boolean not null default false,
  add column if not exists consented_at timestamptz;

comment on column public.bail_requests.consent_marketplace_share is
  'Requester acknowledged BailX may share request details with approved independent providers.';

comment on column public.bail_requests.consent_no_legal_advice is
  'Requester acknowledged BailX is not a law firm, legal representative, or release guarantor.';

comment on column public.bail_requests.consent_terms_privacy is
  'Requester agreed to BailX Terms and Privacy Policy at intake.';

comment on column public.bail_requests.consented_at is
  'Timestamp when required intake disclosure acknowledgements were submitted.';

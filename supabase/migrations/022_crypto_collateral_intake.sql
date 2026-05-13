-- Optional crypto collateral intake metadata.
-- BailX records stated collateral availability only; no wallet, custody,
-- conversion, escrow, or payment fields are created in this migration.

alter table public.bail_requests
  add column if not exists has_crypto_collateral boolean default false,
  add column if not exists crypto_assets text[],
  add column if not exists estimated_crypto_value text,
  add column if not exists crypto_wallet_type text,
  add column if not exists willing_to_convert_to_stablecoin boolean default false,
  add column if not exists preferred_stablecoin text,
  add column if not exists crypto_collateral_notes text,
  add column if not exists crypto_collateral_acknowledged boolean default false,
  add column if not exists crypto_collateral_acknowledged_at timestamptz;

comment on column public.bail_requests.has_crypto_collateral is
  'Consumer indicated possible digital asset collateral availability. BailX does not custody, value, convert, hold, transfer, or guarantee acceptance.';

comment on column public.bail_requests.crypto_assets is
  'Self-reported digital asset categories only. Do not collect wallet addresses, private keys, seed phrases, passwords, screenshots, or login details.';

comment on column public.bail_requests.crypto_collateral_acknowledged is
  'Consumer acknowledged BailX is not a crypto custodian, converter, escrow provider, payment provider, lender, legal representative, or value guarantor.';

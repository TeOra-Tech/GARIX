-- Reporting iOS app purchases to Apple's External Purchase Server API
-- (PUT /externalPurchase/v1/reports, one report per external purchase token).
--
-- Apple wants every custom link token reported: with its transactions (LINE_ITEM), or
-- with none (NO_LINE_ITEM). Tokens Apple tells us about through App Store Server
-- Notifications that we never received are reported as UNRECOGNIZED_TOKEN.

-- The token's externalPurchaseId (decoded server-side from external_token) and expiry.
alter table app_purchase_links
  add column apple_external_purchase_id text,
  add column apple_token_expires_at timestamptz;

create index app_purchase_links_apple_epid_idx on app_purchase_links (apple_external_purchase_id)
  where apple_external_purchase_id is not null;

-- Subscription period of a Pro payment (Apple needs start/end and days of paid service).
alter table app_purchase_transactions
  add column period_start timestamptz,
  add column period_end timestamptz,
  add column apple_report_error text;

-- Every report sent to Apple, kept with billing records. Apple asks us to store the
-- requestIdentifier with the token.
create table apple_external_purchase_reports (
  request_identifier   uuid primary key default gen_random_uuid(),
  external_purchase_id text not null,
  status               text not null check (status in ('LINE_ITEM', 'NO_LINE_ITEM', 'UNRECOGNIZED_TOKEN', 'DUPLICATE_TOKEN')),
  environment          text not null check (environment in ('production', 'sandbox')),
  body                 jsonb not null,
  http_status          integer,
  response             text,
  sent_at              timestamptz not null default now()
);

create index apple_external_purchase_reports_epid_idx on apple_external_purchase_reports (external_purchase_id, sent_at desc);

alter table apple_external_purchase_reports enable row level security;

create policy apple_external_purchase_reports_admin_select on apple_external_purchase_reports
  for select to authenticated
  using (is_admin());

-- Written only by Edge Functions with the service role.
revoke all on apple_external_purchase_reports from anon, authenticated;
grant select on apple_external_purchase_reports to authenticated;

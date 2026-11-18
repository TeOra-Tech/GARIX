-- In-app purchases from the Garix mobile app go to the garix.ie Stripe checkout through
-- the stores' EU link-out programmes:
--   * iOS:     Apple's StoreKit External Purchases or Offers entitlement (ExternalPurchaseCustomLink)
--   * Android: Google Play's external offers programme (BillingProgram.EXTERNAL_OFFER)
-- Both stores require every link-out to be reported with the token the app received
-- (Google within 24 hours of a purchase; Apple monthly, including taps with no purchase).
--
-- app_purchase_links: one row per "Buy" tap in the app, holding the store token.
-- app_purchase_transactions: what happened after the tap (purchase, renewal, refund),
-- written only by the Stripe webhook, with the store-reporting status.

create table app_purchase_links (
  id              uuid primary key default gen_random_uuid(),
  -- Nullable + set null: store-reporting records outlive account and garage deletion
  -- (kept with billing records for 6 years).
  garage_id       uuid references garages(id) on delete set null,
  user_id         uuid references auth.users(id) on delete set null,
  platform        text not null check (platform in ('ios', 'android')),
  program         text not null check (program in ('apple_custom_link', 'google_external_offer')),
  product         text not null check (product in ('credits', 'pro')),
  external_token  text,
  token_type      text check (token_type in ('acquisition', 'services')),
  created_at      timestamptz not null default now(),
  -- Apple: reported in the monthly External Purchase Server API report.
  apple_reported_at timestamptz,
  constraint app_purchase_links_platform_program check (
    (platform = 'ios' and program = 'apple_custom_link') or
    (platform = 'android' and program = 'google_external_offer')
  )
);

create index app_purchase_links_garage_idx on app_purchase_links (garage_id, created_at desc);
create index app_purchase_links_unreported_apple_idx on app_purchase_links (created_at)
  where platform = 'ios' and apple_reported_at is null;

create table app_purchase_transactions (
  id               uuid primary key default gen_random_uuid(),
  link_id          uuid not null references app_purchase_links(id) on delete restrict,
  kind             text not null check (kind in ('purchase', 'renewal', 'refund')),
  -- Stripe object this row came from (checkout session, invoice or refund); unique for idempotency.
  stripe_ref       text not null unique,
  stripe_subscription_id text,
  amount_cents     integer not null,
  tax_cents        integer not null default 0,
  currency         text not null default 'EUR',
  occurred_at      timestamptz not null default now(),
  -- Google: id sent as externalTransactionId (and initialExternalTransactionId for renewals).
  google_reported_at timestamptz,
  google_report_error text,
  apple_reported_at  timestamptz,
  created_at       timestamptz not null default now()
);

create index app_purchase_transactions_link_idx on app_purchase_transactions (link_id);
create index app_purchase_transactions_google_pending_idx on app_purchase_transactions (created_at)
  where google_reported_at is null;

alter table app_purchase_links enable row level security;
alter table app_purchase_transactions enable row level security;

-- The app records its own taps for garages the signed-in user owns.
create policy app_purchase_links_owner_insert on app_purchase_links
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from garages g where g.id = garage_id and g.owner_id = auth.uid())
  );

create policy app_purchase_links_owner_select on app_purchase_links
  for select to authenticated
  using (user_id = auth.uid() or is_admin());

-- Android gets its token after Google's disclosure dialog, so it may set it once.
create policy app_purchase_links_owner_set_token on app_purchase_links
  for update to authenticated
  using (user_id = auth.uid() and external_token is null)
  with check (user_id = auth.uid());

create policy app_purchase_transactions_admin_select on app_purchase_transactions
  for select to authenticated
  using (is_admin());

-- Column-level limits: clients can only write the tap itself and (once) the token.
-- Reporting columns and all transaction rows are service-role only (Stripe webhook).
revoke all on app_purchase_links from anon, authenticated;
grant select on app_purchase_links to authenticated;
grant insert (garage_id, user_id, platform, program, product, external_token, token_type) on app_purchase_links to authenticated;
grant update (external_token) on app_purchase_links to authenticated;
revoke all on app_purchase_transactions from anon, authenticated;
grant select on app_purchase_transactions to authenticated;

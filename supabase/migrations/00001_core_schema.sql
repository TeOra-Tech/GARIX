-- ============================================================
-- GARIX — Core Schema (Phase 1)
-- Marketplace connecting vehicle owners with garages in Ireland
-- Target: Supabase PostgreSQL 15+
-- ============================================================

create extension if not exists "uuid-ossp";
create extension if not exists postgis;        -- geo search (distance, radius)
create extension if not exists pg_trgm;        -- fuzzy garage search

-- ------------------------------------------------------------
-- ENUMS
-- ------------------------------------------------------------
create type user_role as enum ('customer', 'garage_owner', 'admin');
create type fuel_type as enum ('petrol', 'diesel', 'hybrid', 'plugin_hybrid', 'electric', 'lpg', 'other');
create type transmission_type as enum ('manual', 'automatic', 'semi_automatic', 'cvt');
create type urgency_level as enum ('emergency', 'within_24h', 'this_week', 'flexible');
create type request_status as enum ('draft', 'open', 'quoted', 'accepted', 'in_progress', 'completed', 'cancelled', 'expired');
create type quote_status as enum ('submitted', 'accepted', 'rejected', 'withdrawn', 'expired');
create type garage_status as enum ('pending_verification', 'pending_approval', 'active', 'suspended', 'rejected');
create type credit_tx_type as enum ('purchase', 'quote_fee', 'priority_quote_fee', 'featured_listing_fee', 'refund', 'admin_adjustment', 'bonus');
create type payment_status as enum ('pending', 'succeeded', 'failed', 'refunded');
create type notification_channel as enum ('in_app', 'email', 'sms');
create type notification_type as enum (
  'new_service_request', 'new_quote', 'quote_accepted', 'quote_rejected',
  'credit_purchase', 'credit_low', 'new_review', 'garage_approved',
  'garage_rejected', 'new_message', 'job_completed', 'system'
);
create type conversation_status as enum ('active', 'archived', 'closed');

-- ------------------------------------------------------------
-- USERS & PROFILES
-- auth.users is managed by Supabase Auth; user_profiles extends it.
-- ------------------------------------------------------------
create table user_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role user_role not null default 'customer',
  full_name text not null,
  email text not null,
  mobile_number text,
  mobile_verified boolean not null default false,
  email_verified boolean not null default false,
  avatar_url text,
  marketing_opt_in boolean not null default false,     -- GDPR: explicit opt-in
  terms_accepted_at timestamptz,
  data_deletion_requested_at timestamptz,              -- GDPR right to erasure
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table user_addresses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references user_profiles (id) on delete cascade,
  label text default 'Home',
  line1 text not null,
  line2 text,
  town text not null,
  county text not null,
  eircode text,
  country_code char(2) not null default 'IE',
  location geography(point, 4326),
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_user_addresses_user on user_addresses (user_id);

-- ------------------------------------------------------------
-- GARAGES
-- ------------------------------------------------------------
create table garages (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references user_profiles (id) on delete restrict,
  status garage_status not null default 'pending_verification',
  name text not null,
  slug text not null unique,
  contact_person text not null,
  phone text not null,
  email text,
  website text,
  description text,
  logo_url text,
  cover_image_url text,
  years_in_business int check (years_in_business >= 0),
  service_radius_km int not null default 20 check (service_radius_km between 1 and 500),
  opening_hours jsonb not null default '{}'::jsonb,     -- {"mon":{"open":"08:30","close":"18:00"},...}
  is_ev_specialist boolean not null default false,
  offers_collection boolean not null default false,
  completed_jobs_count int not null default 0,
  avg_rating numeric(3,2) not null default 0,
  review_count int not null default 0,
  approved_at timestamptz,
  approved_by uuid references user_profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_garages_status on garages (status);
create index idx_garages_name_trgm on garages using gin (name gin_trgm_ops);

create table garage_locations (
  id uuid primary key default uuid_generate_v4(),
  garage_id uuid not null references garages (id) on delete cascade,
  line1 text not null,
  line2 text,
  town text not null,
  county text not null,
  eircode text,
  country_code char(2) not null default 'IE',
  location geography(point, 4326) not null,
  is_primary boolean not null default true,
  created_at timestamptz not null default now()
);
create index idx_garage_locations_geo on garage_locations using gist (location);
create index idx_garage_locations_garage on garage_locations (garage_id);

create table garage_services (
  id uuid primary key default uuid_generate_v4(),
  garage_id uuid not null references garages (id) on delete cascade,
  repair_category_id uuid not null,                     -- FK added after repair_categories
  price_from numeric(10,2),
  notes text,
  unique (garage_id, repair_category_id)
);

create table garage_photos (
  id uuid primary key default uuid_generate_v4(),
  garage_id uuid not null references garages (id) on delete cascade,
  storage_path text not null,
  caption text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table garage_certifications (
  id uuid primary key default uuid_generate_v4(),
  garage_id uuid not null references garages (id) on delete cascade,
  name text not null,
  issuing_body text,
  document_path text,
  verified boolean not null default false,
  expires_at date,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- VEHICLE REFERENCE DATA + CUSTOMER VEHICLES
-- ------------------------------------------------------------
create table vehicle_makes (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique
);

create table vehicle_models (
  id uuid primary key default uuid_generate_v4(),
  make_id uuid not null references vehicle_makes (id) on delete cascade,
  name text not null,
  unique (make_id, name)
);

create table vehicle_engines (
  id uuid primary key default uuid_generate_v4(),
  label text not null unique,          -- '0.8L','1.0L',...,'5.0L+','custom'
  litres numeric(3,1),
  is_custom boolean not null default false
);

create table vehicles (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references user_profiles (id) on delete cascade,
  registration_number text not null,
  make_id uuid references vehicle_makes (id),
  model_id uuid references vehicle_models (id),
  make_text text,                      -- denormalised fallback for lookup API
  model_text text,
  variant text,
  year int check (year between 1950 and 2100),
  engine_id uuid references vehicle_engines (id),
  engine_size_custom text,
  fuel_type fuel_type,
  transmission transmission_type,
  vin text,
  mileage_km int check (mileage_km >= 0),
  lookup_source text,                  -- integration layer: 'manual' | 'cartell' | 'motorcheck' | ...
  lookup_payload jsonb,                -- raw response from future vehicle lookup API
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, registration_number)
);
create index idx_vehicles_owner on vehicles (owner_id);

create table vehicle_history (
  id uuid primary key default uuid_generate_v4(),
  vehicle_id uuid not null references vehicles (id) on delete cascade,
  event_type text not null,            -- 'service','repair','nct','ownership_change'
  event_date date not null,
  mileage_km int,
  description text,
  garage_id uuid references garages (id),
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- REPAIR TAXONOMY
-- ------------------------------------------------------------
create table repair_categories (
  id uuid primary key default uuid_generate_v4(),
  parent_id uuid references repair_categories (id) on delete cascade,
  name text not null,
  slug text not null unique,
  description text,
  sort_order int not null default 0
);
create index idx_repair_categories_parent on repair_categories (parent_id);

alter table garage_services
  add constraint fk_garage_services_category
  foreign key (repair_category_id) references repair_categories (id) on delete cascade;

-- ------------------------------------------------------------
-- SERVICE REQUESTS (marketplace)
-- ------------------------------------------------------------
create table service_requests (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid not null references user_profiles (id) on delete cascade,
  vehicle_id uuid not null references vehicles (id) on delete restrict,
  service_category_id uuid references repair_categories (id),
  problem_category_id uuid references repair_categories (id),
  title text not null,
  description text not null,
  urgency urgency_level not null default 'flexible',
  status request_status not null default 'open',
  location geography(point, 4326),
  location_town text,
  location_county text,
  collection_required boolean not null default false,
  expected_completion_date date,
  budget_amount numeric(10,2),
  accepted_quote_id uuid,              -- FK added after quotes
  expires_at timestamptz not null default now() + interval '14 days',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_service_requests_status on service_requests (status);
create index idx_service_requests_customer on service_requests (customer_id);
create index idx_service_requests_geo on service_requests using gist (location);

create table request_attachments (
  id uuid primary key default uuid_generate_v4(),
  request_id uuid not null references service_requests (id) on delete cascade,
  storage_path text not null,
  media_type text not null check (media_type in ('image', 'video', 'document')),
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- QUOTES & VAT
-- Irish VAT: parts 23%, labour 13.5% — rates stored, never hardcoded in app.
-- ------------------------------------------------------------
create table vat_rates (
  id uuid primary key default uuid_generate_v4(),
  code text not null unique,           -- 'IE_PARTS','IE_LABOUR'
  rate numeric(5,4) not null,          -- 0.2300, 0.1350
  valid_from date not null default current_date,
  valid_to date
);

create table quotes (
  id uuid primary key default uuid_generate_v4(),
  request_id uuid not null references service_requests (id) on delete cascade,
  garage_id uuid not null references garages (id) on delete cascade,
  status quote_status not null default 'submitted',
  is_priority boolean not null default false,
  labour_cost numeric(10,2) not null check (labour_cost >= 0),
  parts_cost numeric(10,2) not null check (parts_cost >= 0),
  labour_vat_rate numeric(5,4) not null default 0.1350,
  parts_vat_rate numeric(5,4) not null default 0.2300,
  labour_vat numeric(10,2) generated always as (round(labour_cost * labour_vat_rate, 2)) stored,
  parts_vat numeric(10,2) generated always as (round(parts_cost * parts_vat_rate, 2)) stored,
  total_vat numeric(10,2) generated always as
    (round(labour_cost * labour_vat_rate, 2) + round(parts_cost * parts_vat_rate, 2)) stored,
  grand_total numeric(10,2) generated always as
    (labour_cost + parts_cost
     + round(labour_cost * labour_vat_rate, 2)
     + round(parts_cost * parts_vat_rate, 2)) stored,
  estimated_duration_hours numeric(5,1),
  warranty_info text,
  notes text,
  credits_charged int not null default 0,
  valid_until timestamptz not null default now() + interval '7 days',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (request_id, garage_id)       -- one quote per garage per request
);
create index idx_quotes_request on quotes (request_id);
create index idx_quotes_garage on quotes (garage_id);

alter table service_requests
  add constraint fk_accepted_quote
  foreign key (accepted_quote_id) references quotes (id) on delete set null;

create table quote_items (
  id uuid primary key default uuid_generate_v4(),
  quote_id uuid not null references quotes (id) on delete cascade,
  item_type text not null check (item_type in ('labour', 'part')),
  description text not null,
  quantity numeric(8,2) not null default 1,
  unit_price numeric(10,2) not null,
  line_total numeric(10,2) generated always as (round(quantity * unit_price, 2)) stored
);

-- Audit trail of every VAT computation shown to a customer (compliance)
create table vat_calculations (
  id uuid primary key default uuid_generate_v4(),
  quote_id uuid references quotes (id) on delete set null,
  parts_net numeric(10,2) not null,
  labour_net numeric(10,2) not null,
  parts_vat_rate numeric(5,4) not null,
  labour_vat_rate numeric(5,4) not null,
  parts_vat numeric(10,2) not null,
  labour_vat numeric(10,2) not null,
  total_vat numeric(10,2) not null,
  grand_total numeric(10,2) not null,
  calculated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- CREDITS & PAYMENTS
-- ------------------------------------------------------------
create table credit_wallets (
  garage_id uuid primary key references garages (id) on delete cascade,
  balance int not null default 0 check (balance >= 0),
  low_balance_threshold int not null default 10,
  updated_at timestamptz not null default now()
);

create table credit_transactions (
  id uuid primary key default uuid_generate_v4(),
  garage_id uuid not null references garages (id) on delete cascade,
  type credit_tx_type not null,
  amount int not null,                 -- positive = credit, negative = debit
  balance_after int not null,
  reference_id uuid,                   -- quote id / payment id / etc.
  description text,
  created_by uuid references user_profiles (id),
  created_at timestamptz not null default now()
);
create index idx_credit_tx_garage on credit_transactions (garage_id, created_at desc);

create table credit_packs (
  id uuid primary key default uuid_generate_v4(),
  credits int not null,
  price_eur numeric(10,2) not null,
  stripe_price_id text,
  is_active boolean not null default true,
  sort_order int not null default 0
);

create table payments (
  id uuid primary key default uuid_generate_v4(),
  garage_id uuid not null references garages (id) on delete restrict,
  credit_pack_id uuid references credit_packs (id),
  stripe_payment_intent_id text unique,
  stripe_checkout_session_id text,
  amount_eur numeric(10,2) not null,
  credits_purchased int not null,
  status payment_status not null default 'pending',
  invoice_path text,                   -- storage: invoices bucket
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_payments_garage on payments (garage_id);

-- ------------------------------------------------------------
-- REVIEWS & RATINGS
-- ------------------------------------------------------------
create table reviews (
  id uuid primary key default uuid_generate_v4(),
  request_id uuid not null unique references service_requests (id) on delete cascade,
  garage_id uuid not null references garages (id) on delete cascade,
  customer_id uuid not null references user_profiles (id) on delete cascade,
  rating_quality smallint not null check (rating_quality between 1 and 5),
  rating_communication smallint not null check (rating_communication between 1 and 5),
  rating_price smallint not null check (rating_price between 1 and 5),
  rating_speed smallint not null check (rating_speed between 1 and 5),
  rating_overall smallint not null check (rating_overall between 1 and 5),
  body text,
  garage_response text,
  garage_responded_at timestamptz,
  is_moderated boolean not null default false,
  is_hidden boolean not null default false,
  fraud_score numeric(4,3),            -- populated by anti-fraud edge function
  created_at timestamptz not null default now()
);
create index idx_reviews_garage on reviews (garage_id);

create table review_photos (
  id uuid primary key default uuid_generate_v4(),
  review_id uuid not null references reviews (id) on delete cascade,
  storage_path text not null
);

-- ------------------------------------------------------------
-- MESSAGING (Supabase Realtime on `messages`)
-- ------------------------------------------------------------
create table conversations (
  id uuid primary key default uuid_generate_v4(),
  request_id uuid references service_requests (id) on delete set null,
  customer_id uuid not null references user_profiles (id) on delete cascade,
  garage_id uuid not null references garages (id) on delete cascade,
  status conversation_status not null default 'active',
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  unique (request_id, customer_id, garage_id)
);
create index idx_conversations_customer on conversations (customer_id);
create index idx_conversations_garage on conversations (garage_id);

create table messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references conversations (id) on delete cascade,
  sender_id uuid not null references user_profiles (id) on delete cascade,
  body text,
  attachment_path text,
  attachment_type text check (attachment_type in ('image', 'document')),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_messages_conversation on messages (conversation_id, created_at);

-- ------------------------------------------------------------
-- NOTIFICATIONS
-- ------------------------------------------------------------
create table notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references user_profiles (id) on delete cascade,
  type notification_type not null,
  channel notification_channel not null default 'in_app',
  title text not null,
  body text,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_notifications_user on notifications (user_id, created_at desc);

create table notification_preferences (
  user_id uuid primary key references user_profiles (id) on delete cascade,
  email_enabled boolean not null default true,
  sms_enabled boolean not null default false,
  in_app_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- ADMIN, SETTINGS, AUDIT, REPORTS
-- ------------------------------------------------------------
create table system_settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_by uuid references user_profiles (id),
  updated_at timestamptz not null default now()
);

create table audit_logs (
  id uuid primary key default uuid_generate_v4(),
  actor_id uuid references user_profiles (id),
  action text not null,                -- 'garage.approved','quote.accepted',...
  entity_type text not null,
  entity_id uuid,
  before_state jsonb,
  after_state jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);
create index idx_audit_logs_entity on audit_logs (entity_type, entity_id);
create index idx_audit_logs_actor on audit_logs (actor_id, created_at desc);

create table disputes (
  id uuid primary key default uuid_generate_v4(),
  request_id uuid not null references service_requests (id) on delete cascade,
  opened_by uuid not null references user_profiles (id),
  reason text not null,
  status text not null default 'open' check (status in ('open', 'investigating', 'resolved', 'closed')),
  resolution text,
  resolved_by uuid references user_profiles (id),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table reports (
  id uuid primary key default uuid_generate_v4(),
  reporter_id uuid not null references user_profiles (id),
  entity_type text not null,           -- 'review','garage','message','request'
  entity_id uuid not null,
  reason text not null,
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'actioned', 'dismissed')),
  handled_by uuid references user_profiles (id),
  created_at timestamptz not null default now()
);

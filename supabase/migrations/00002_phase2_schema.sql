-- ============================================================
-- GARIX — Phase 2 Architecture (designed now, activated later)
-- ============================================================

-- ---------- Garage subscription plans ----------
create table subscription_plans (
  id uuid primary key default uuid_generate_v4(),
  code text not null unique,           -- 'starter','professional','enterprise'
  name text not null,
  monthly_price_eur numeric(10,2) not null,
  included_credits int not null default 0,
  features jsonb not null default '{}'::jsonb,
  stripe_price_id text,
  is_active boolean not null default true
);

create table subscriptions (
  id uuid primary key default uuid_generate_v4(),
  garage_id uuid not null references garages (id) on delete cascade,
  plan_id uuid not null references subscription_plans (id),
  stripe_subscription_id text unique,
  status text not null default 'active' check (status in ('trialing','active','past_due','cancelled','expired')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now()
);

create table subscription_usage (
  id uuid primary key default uuid_generate_v4(),
  subscription_id uuid not null references subscriptions (id) on delete cascade,
  metric text not null,                -- 'quotes_submitted','featured_days'
  quantity int not null default 0,
  period_start date not null,
  period_end date not null
);

-- ---------- Featured garage advertising ----------
create table featured_campaigns (
  id uuid primary key default uuid_generate_v4(),
  garage_id uuid not null references garages (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  placement text not null default 'search' check (placement in ('search','home','category')),
  credits_charged int not null default 0,
  status text not null default 'scheduled' check (status in ('scheduled','active','completed','cancelled')),
  created_at timestamptz not null default now()
);

create table featured_payments (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references featured_campaigns (id) on delete cascade,
  payment_id uuid references payments (id),
  amount_eur numeric(10,2),
  created_at timestamptz not null default now()
);

-- ---------- Appointment booking ----------
create table booking_rules (
  garage_id uuid primary key references garages (id) on delete cascade,
  slot_minutes int not null default 60,
  max_daily_bookings int,
  lead_time_hours int not null default 12,
  updated_at timestamptz not null default now()
);

create table availability_slots (
  id uuid primary key default uuid_generate_v4(),
  garage_id uuid not null references garages (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  is_booked boolean not null default false,
  unique (garage_id, starts_at)
);

create table appointments (
  id uuid primary key default uuid_generate_v4(),
  garage_id uuid not null references garages (id) on delete cascade,
  customer_id uuid not null references user_profiles (id) on delete cascade,
  vehicle_id uuid references vehicles (id),
  request_id uuid references service_requests (id),
  slot_id uuid references availability_slots (id),
  starts_at timestamptz not null,
  status text not null default 'confirmed' check (status in ('confirmed','completed','cancelled','no_show')),
  notes text,
  created_at timestamptz not null default now()
);

-- ---------- Service reminders ----------
create table maintenance_schedules (
  id uuid primary key default uuid_generate_v4(),
  vehicle_id uuid not null references vehicles (id) on delete cascade,
  service_type text not null,          -- 'oil_change','nct','timing_belt'
  interval_months int,
  interval_km int,
  last_done_at date,
  last_done_km int,
  created_at timestamptz not null default now()
);

create table reminders (
  id uuid primary key default uuid_generate_v4(),
  schedule_id uuid not null references maintenance_schedules (id) on delete cascade,
  user_id uuid not null references user_profiles (id) on delete cascade,
  due_at date not null,
  sent_at timestamptz,
  channel notification_channel not null default 'email'
);

-- ---------- Digital service history ----------
create table service_records (
  id uuid primary key default uuid_generate_v4(),
  vehicle_id uuid not null references vehicles (id) on delete cascade,
  garage_id uuid references garages (id),
  request_id uuid references service_requests (id),
  performed_at date not null,
  mileage_km int,
  work_summary text not null,
  parts_used jsonb,
  total_cost numeric(10,2),
  created_at timestamptz not null default now()
);

create table vehicle_documents (
  id uuid primary key default uuid_generate_v4(),
  vehicle_id uuid not null references vehicles (id) on delete cascade,
  doc_type text not null,              -- 'invoice','nct_cert','insurance'
  storage_path text not null,
  issued_at date,
  created_at timestamptz not null default now()
);

-- ---------- Insurance repairs ----------
create table insurance_claims (
  id uuid primary key default uuid_generate_v4(),
  request_id uuid not null references service_requests (id) on delete cascade,
  insurer_name text not null,
  policy_number text,
  claim_reference text,
  status text not null default 'submitted' check (status in ('submitted','approved','rejected','settled')),
  approved_amount numeric(10,2),
  created_at timestamptz not null default now()
);

create table insurance_documents (
  id uuid primary key default uuid_generate_v4(),
  claim_id uuid not null references insurance_claims (id) on delete cascade,
  storage_path text not null,
  doc_type text,
  created_at timestamptz not null default now()
);

-- ---------- Breakdown assistance ----------
create table breakdown_requests (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid not null references user_profiles (id) on delete cascade,
  vehicle_id uuid references vehicles (id),
  location geography(point, 4326) not null,
  description text,
  status text not null default 'open' check (status in ('open','dispatched','on_scene','resolved','cancelled')),
  created_at timestamptz not null default now()
);

create table dispatches (
  id uuid primary key default uuid_generate_v4(),
  breakdown_id uuid not null references breakdown_requests (id) on delete cascade,
  garage_id uuid not null references garages (id),
  eta_minutes int,
  dispatched_at timestamptz not null default now(),
  arrived_at timestamptz,
  completed_at timestamptz
);

-- ---------- Fleet management ----------
create table fleets (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  company_name text,
  owner_id uuid not null references user_profiles (id),
  created_at timestamptz not null default now()
);

create table fleet_vehicles (
  fleet_id uuid not null references fleets (id) on delete cascade,
  vehicle_id uuid not null references vehicles (id) on delete cascade,
  primary key (fleet_id, vehicle_id)
);

create table fleet_managers (
  fleet_id uuid not null references fleets (id) on delete cascade,
  user_id uuid not null references user_profiles (id) on delete cascade,
  role text not null default 'manager' check (role in ('owner','manager','viewer')),
  primary key (fleet_id, user_id)
);

-- ---------- AI repair estimates (training data capture starts day 1) ----------
create table repair_training_data (
  id uuid primary key default uuid_generate_v4(),
  request_id uuid references service_requests (id) on delete set null,
  quote_id uuid references quotes (id) on delete set null,
  vehicle_snapshot jsonb not null,     -- make/model/year/engine/fuel/mileage at time of job
  repair_category text,
  labour_hours numeric(6,2),
  labour_cost numeric(10,2),
  parts_cost numeric(10,2),
  quote_outcome text check (quote_outcome in ('accepted','rejected','expired','withdrawn')),
  repair_outcome text,                 -- 'completed','disputed','repeat_visit'
  region text,
  created_at timestamptz not null default now()
);

create table repair_predictions (
  id uuid primary key default uuid_generate_v4(),
  request_id uuid references service_requests (id) on delete cascade,
  model_version text not null,
  predicted_labour_cost numeric(10,2),
  predicted_parts_cost numeric(10,2),
  confidence numeric(4,3),
  features_used jsonb,
  created_at timestamptz not null default now()
);

-- ---------- Parts marketplace ----------
create table suppliers (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  contact_email text,
  phone text,
  created_at timestamptz not null default now()
);

create table parts (
  id uuid primary key default uuid_generate_v4(),
  supplier_id uuid references suppliers (id),
  sku text,
  name text not null,
  oem_number text,
  category text,
  unit_price numeric(10,2),
  created_at timestamptz not null default now()
);

create table inventory (
  id uuid primary key default uuid_generate_v4(),
  part_id uuid not null references parts (id) on delete cascade,
  supplier_id uuid references suppliers (id),
  quantity int not null default 0,
  updated_at timestamptz not null default now()
);

create table orders (
  id uuid primary key default uuid_generate_v4(),
  garage_id uuid references garages (id),
  supplier_id uuid references suppliers (id),
  status text not null default 'placed' check (status in ('placed','shipped','delivered','cancelled')),
  total_eur numeric(10,2),
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------- EV charging directory ----------
create table charger_types (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,           -- 'CCS','CHAdeMO','Type 2'
  max_kw numeric(6,1)
);

create table charging_stations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  operator text,
  location geography(point, 4326) not null,
  address text,
  county text,
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

create table charging_station_chargers (
  station_id uuid not null references charging_stations (id) on delete cascade,
  charger_type_id uuid not null references charger_types (id),
  count int not null default 1,
  primary key (station_id, charger_type_id)
);

create table charging_reviews (
  id uuid primary key default uuid_generate_v4(),
  station_id uuid not null references charging_stations (id) on delete cascade,
  user_id uuid not null references user_profiles (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  body text,
  created_at timestamptz not null default now()
);

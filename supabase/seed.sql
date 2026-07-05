-- ============================================================
-- GARIX — Seed data
-- ============================================================

-- ---------- VAT rates (Ireland) ----------
insert into vat_rates (code, rate) values
  ('IE_PARTS',  0.2300),
  ('IE_LABOUR', 0.1350);

-- ---------- Credit packs (1 credit = €1) ----------
insert into credit_packs (credits, price_eur, sort_order) values
  (20,  20.00, 1),
  (50,  50.00, 2),
  (100, 100.00, 3),
  (500, 500.00, 4);

-- ---------- System settings (admin-tunable pricing) ----------
insert into system_settings (key, value, description) values
  ('credits.submit_quote',    '{"cost": 2,  "public": true}',  'Credits to submit a standard quote'),
  ('credits.priority_quote',  '{"cost": 5,  "public": true}',  'Credits to submit a priority quote'),
  ('credits.featured_listing','{"cost": 10, "public": true}',  'Credits per day of featured listing'),
  ('credits.low_threshold',   '{"value": 10, "public": false}','Wallet balance that triggers a low-credit warning'),
  ('requests.expiry_days',    '{"value": 14, "public": false}','Days before an open request expires'),
  ('platform.region',         '{"value": "IE", "public": true}','Launch region');

-- ---------- Engine sizes ----------
insert into vehicle_engines (label, litres, is_custom) values
  ('0.8L', 0.8, false), ('1.0L', 1.0, false), ('1.2L', 1.2, false),
  ('1.4L', 1.4, false), ('1.5L', 1.5, false), ('1.6L', 1.6, false),
  ('1.8L', 1.8, false), ('2.0L', 2.0, false), ('2.2L', 2.2, false),
  ('2.5L', 2.5, false), ('3.0L', 3.0, false), ('4.0L', 4.0, false),
  ('5.0L+', 5.0, false), ('Custom', null, true);

-- ---------- Vehicle makes (top of Irish market; extend via lookup API) ----------
insert into vehicle_makes (name) values
  ('Toyota'), ('Volkswagen'), ('Hyundai'), ('Skoda'), ('Kia'), ('Ford'),
  ('BMW'), ('Audi'), ('Mercedes-Benz'), ('Nissan'), ('Renault'), ('Peugeot'),
  ('Opel'), ('Dacia'), ('Honda'), ('Mazda'), ('SEAT'), ('Tesla'), ('Volvo'), ('Land Rover');

-- ---------- Repair taxonomy: categories + detailed repair types ----------
with cats as (
  insert into repair_categories (name, slug, sort_order) values
    ('Engine', 'engine', 1),
    ('Transmission', 'transmission', 2),
    ('Brakes', 'brakes', 3),
    ('Suspension', 'suspension', 4),
    ('Steering', 'steering', 5),
    ('Electrical', 'electrical', 6),
    ('Battery', 'battery', 7),
    ('Cooling System', 'cooling-system', 8),
    ('Air Conditioning', 'air-conditioning', 9),
    ('Exhaust', 'exhaust', 10),
    ('Fuel System', 'fuel-system', 11),
    ('Hybrid Systems', 'hybrid-systems', 12),
    ('EV Systems', 'ev-systems', 13),
    ('Diagnostics', 'diagnostics', 14),
    ('Bodywork', 'bodywork', 15),
    ('Tyres', 'tyres', 16)
  returning id, slug
)
insert into repair_categories (parent_id, name, slug, sort_order)
select c.id, t.name, c.slug || '-' || t.sub_slug, t.ord
from cats c
join lateral (
  values
    -- Engine
    ('engine', 'Timing belt / chain replacement', 'timing-belt', 1),
    ('engine', 'Head gasket repair', 'head-gasket', 2),
    ('engine', 'Oil leak repair', 'oil-leak', 3),
    ('engine', 'Engine rebuild / replacement', 'rebuild', 4),
    ('engine', 'Turbocharger repair', 'turbo', 5),
    ('engine', 'Oil and filter service', 'oil-service', 6),
    -- Transmission
    ('transmission', 'Clutch replacement', 'clutch', 1),
    ('transmission', 'Gearbox repair / rebuild', 'gearbox', 2),
    ('transmission', 'Automatic transmission service', 'auto-service', 3),
    ('transmission', 'Flywheel replacement', 'flywheel', 4),
    ('transmission', 'Driveshaft / CV joint', 'driveshaft', 5),
    -- Brakes
    ('brakes', 'Brake pads replacement', 'pads', 1),
    ('brakes', 'Brake discs replacement', 'discs', 2),
    ('brakes', 'Brake fluid change', 'fluid', 3),
    ('brakes', 'Handbrake repair', 'handbrake', 4),
    ('brakes', 'ABS fault repair', 'abs', 5),
    ('brakes', 'Brake caliper repair', 'caliper', 6),
    -- Suspension
    ('suspension', 'Shock absorbers replacement', 'shocks', 1),
    ('suspension', 'Coil springs replacement', 'springs', 2),
    ('suspension', 'Ball joints / bushings', 'ball-joints', 3),
    ('suspension', 'Wheel bearing replacement', 'wheel-bearing', 4),
    ('suspension', 'Anti-roll bar links', 'arb-links', 5),
    -- Steering
    ('steering', 'Power steering repair', 'power-steering', 1),
    ('steering', 'Steering rack replacement', 'rack', 2),
    ('steering', 'Track rod ends', 'track-rods', 3),
    ('steering', 'Wheel alignment', 'alignment', 4),
    -- Electrical
    ('electrical', 'Alternator replacement', 'alternator', 1),
    ('electrical', 'Starter motor repair', 'starter', 2),
    ('electrical', 'Wiring fault diagnosis', 'wiring', 3),
    ('electrical', 'Lighting repair', 'lights', 4),
    ('electrical', 'Central locking / windows', 'locking', 5),
    -- Battery
    ('battery', '12V battery replacement', '12v-replacement', 1),
    ('battery', 'Battery testing', 'testing', 2),
    ('battery', 'Charging system diagnosis', 'charging', 3),
    -- Cooling
    ('cooling-system', 'Radiator replacement', 'radiator', 1),
    ('cooling-system', 'Water pump replacement', 'water-pump', 2),
    ('cooling-system', 'Thermostat replacement', 'thermostat', 3),
    ('cooling-system', 'Coolant leak repair', 'coolant-leak', 4),
    -- A/C
    ('air-conditioning', 'A/C regas', 'regas', 1),
    ('air-conditioning', 'Compressor replacement', 'compressor', 2),
    ('air-conditioning', 'Condenser repair', 'condenser', 3),
    ('air-conditioning', 'Leak detection', 'leak', 4),
    -- Exhaust
    ('exhaust', 'Full exhaust replacement', 'full', 1),
    ('exhaust', 'Catalytic converter', 'cat', 2),
    ('exhaust', 'DPF cleaning / replacement', 'dpf', 3),
    ('exhaust', 'Silencer / backbox', 'silencer', 4),
    -- Fuel
    ('fuel-system', 'Fuel pump replacement', 'pump', 1),
    ('fuel-system', 'Injector cleaning / replacement', 'injectors', 2),
    ('fuel-system', 'Fuel filter change', 'filter', 3),
    ('fuel-system', 'Wrong fuel recovery', 'wrong-fuel', 4),
    -- Hybrid
    ('hybrid-systems', 'Hybrid battery diagnostics', 'battery-diag', 1),
    ('hybrid-systems', 'Hybrid battery replacement', 'battery-replace', 2),
    ('hybrid-systems', 'Inverter / converter repair', 'inverter', 3),
    -- EV
    ('ev-systems', 'EV battery health check', 'battery-health', 1),
    ('ev-systems', 'Charging port repair', 'charge-port', 2),
    ('ev-systems', 'EV motor diagnostics', 'motor', 3),
    ('ev-systems', 'High-voltage system repair', 'hv-system', 4),
    -- Diagnostics
    ('diagnostics', 'Engine warning light diagnosis', 'engine-light', 1),
    ('diagnostics', 'Full vehicle health check', 'health-check', 2),
    ('diagnostics', 'Pre-NCT check', 'pre-nct', 3),
    ('diagnostics', 'Pre-purchase inspection', 'pre-purchase', 4),
    -- Bodywork
    ('bodywork', 'Dent repair', 'dent', 1),
    ('bodywork', 'Scratch / paint repair', 'paint', 2),
    ('bodywork', 'Bumper repair', 'bumper', 3),
    ('bodywork', 'Windscreen replacement', 'windscreen', 4),
    ('bodywork', 'Rust treatment', 'rust', 5),
    -- Tyres
    ('tyres', 'Tyre replacement', 'replacement', 1),
    ('tyres', 'Puncture repair', 'puncture', 2),
    ('tyres', 'Wheel balancing', 'balancing', 3),
    ('tyres', 'TPMS sensor repair', 'tpms', 4)
) as t(parent_slug, name, sub_slug, ord) on t.parent_slug = c.slug;

-- ---------- Subscription plans (Phase 2, pre-seeded inactive-safe) ----------
insert into subscription_plans (code, name, monthly_price_eur, included_credits, features) values
  ('starter',      'Starter',      29.00,  30,  '{"priority_support": false, "featured_days": 0}'),
  ('professional', 'Professional', 79.00,  100, '{"priority_support": true,  "featured_days": 2}'),
  ('enterprise',   'Enterprise',   199.00, 300, '{"priority_support": true,  "featured_days": 7, "account_manager": true}');

-- ---------- EV charger types ----------
insert into charger_types (name, max_kw) values
  ('Type 2 AC', 22), ('CCS', 350), ('CHAdeMO', 100);

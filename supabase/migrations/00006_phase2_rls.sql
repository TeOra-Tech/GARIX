-- ============================================================
-- GARIX — Phase 2 Row Level Security
-- Enables RLS on every phase-2 table (00002_phase2_schema.sql),
-- which shipped without it. Default deny: enabling RLS with no
-- policy blocks all access for anon/authenticated. Then:
--   - reference/directory data → public read, admin write
--   - customer data            → owner-scoped
--   - garage data              → owns_garage()-scoped
--   - financial writes (subscriptions, featured campaigns,
--     orders fulfilment, dispatch creation) → service role /
--     admin only, same as 00004.
-- ============================================================

-- ---------- Helpers ----------
-- security definer (like owns_garage) so policies on fleets and
-- fleet_managers can reference each other without RLS recursion
create or replace function owns_fleet(f uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from fleets where id = f and owner_id = auth.uid());
$$;

create or replace function in_fleet(f uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from fleet_managers where fleet_id = f and user_id = auth.uid());
$$;

-- breaks breakdown_requests <-> dispatches policy recursion
create or replace function dispatched_to_my_garage(b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from dispatches d
      join garages g on g.id = d.garage_id
     where d.breakdown_id = b and g.owner_id = auth.uid());
$$;

create or replace function is_active_garage_owner()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from garages g where g.owner_id = auth.uid() and g.status = 'active');
$$;

-- ---------- Enable RLS on every phase-2 table ----------
do $$
declare t text;
begin
  foreach t in array array[
    'subscription_plans','subscriptions','subscription_usage',
    'featured_campaigns','featured_payments',
    'booking_rules','availability_slots','appointments',
    'maintenance_schedules','reminders',
    'service_records','vehicle_documents',
    'insurance_claims','insurance_documents',
    'breakdown_requests','dispatches',
    'fleets','fleet_vehicles','fleet_managers',
    'repair_training_data','repair_predictions',
    'suppliers','parts','inventory','orders',
    'charger_types','charging_stations','charging_station_chargers','charging_reviews'
  ] loop
    execute format('alter table %s enable row level security', t);
  end loop;
end $$;

-- ---------- subscriptions (writes via Stripe webhook / service role) ----------
create policy "public read active plans" on subscription_plans for select
  using (is_active or is_admin());
create policy "admin manage plans" on subscription_plans for all using (is_admin());

create policy "garage read own subscription" on subscriptions for select
  using (owns_garage(garage_id) or is_admin());
create policy "admin manage subscriptions" on subscriptions for all using (is_admin());

create policy "garage read own subscription usage" on subscription_usage for select
  using (exists (select 1 from subscriptions s
                  where s.id = subscription_id and owns_garage(s.garage_id))
         or is_admin());
create policy "admin manage subscription usage" on subscription_usage for all using (is_admin());

-- ---------- featured advertising (credit spend → server-side only) ----------
create policy "garage read own campaigns" on featured_campaigns for select
  using (owns_garage(garage_id) or is_admin());
create policy "admin manage campaigns" on featured_campaigns for all using (is_admin());

create policy "garage read own featured payments" on featured_payments for select
  using (exists (select 1 from featured_campaigns fc
                  where fc.id = campaign_id and owns_garage(fc.garage_id))
         or is_admin());
create policy "admin manage featured payments" on featured_payments for all using (is_admin());

-- ---------- appointment booking ----------
create policy "public read booking rules" on booking_rules for select using (true);
create policy "owner manage booking rules" on booking_rules for all
  using (owns_garage(garage_id) or is_admin())
  with check (owns_garage(garage_id) or is_admin());

create policy "public read availability" on availability_slots for select using (true);
create policy "owner manage availability" on availability_slots for all
  using (owns_garage(garage_id) or is_admin())
  with check (owns_garage(garage_id) or is_admin());

create policy "participants read appointments" on appointments for select
  using (customer_id = auth.uid() or owns_garage(garage_id) or is_admin());
create policy "customer book appointment" on appointments for insert
  with check (customer_id = auth.uid());
create policy "participants update appointment" on appointments for update
  using (customer_id = auth.uid() or owns_garage(garage_id))
  with check (customer_id = auth.uid() or owns_garage(garage_id));
create policy "admin manage appointments" on appointments for all using (is_admin());

-- ---------- service reminders ----------
create policy "own maintenance schedules" on maintenance_schedules for all
  using (exists (select 1 from vehicles v where v.id = vehicle_id and v.owner_id = auth.uid()) or is_admin())
  with check (exists (select 1 from vehicles v where v.id = vehicle_id and v.owner_id = auth.uid()) or is_admin());

create policy "own reminders" on reminders for all
  using (user_id = auth.uid() or is_admin())
  with check (user_id = auth.uid() or is_admin());

-- ---------- digital service history ----------
create policy "read service records" on service_records for select
  using (exists (select 1 from vehicles v where v.id = vehicle_id and v.owner_id = auth.uid())
         or owns_garage(garage_id) or is_admin());
-- vehicle owner logs own (DIY) records; garages log records for jobs they did
create policy "insert service records" on service_records for insert
  with check ((garage_id is null
               and exists (select 1 from vehicles v where v.id = vehicle_id and v.owner_id = auth.uid()))
              or owns_garage(garage_id) or is_admin());
-- garage-authored records are tamper-resistant history: owner may only
-- modify their own DIY entries
create policy "owner manage diy records" on service_records for update
  using (garage_id is null
         and exists (select 1 from vehicles v where v.id = vehicle_id and v.owner_id = auth.uid()));
create policy "owner delete diy records" on service_records for delete
  using (garage_id is null
         and exists (select 1 from vehicles v where v.id = vehicle_id and v.owner_id = auth.uid()));
create policy "admin manage service records" on service_records for all using (is_admin());

create policy "own vehicle documents" on vehicle_documents for all
  using (exists (select 1 from vehicles v where v.id = vehicle_id and v.owner_id = auth.uid()) or is_admin())
  with check (exists (select 1 from vehicles v where v.id = vehicle_id and v.owner_id = auth.uid()) or is_admin());

-- ---------- insurance repairs ----------
create policy "customer own claims" on insurance_claims for all
  using (exists (select 1 from service_requests sr
                  where sr.id = request_id and sr.customer_id = auth.uid())
         or is_admin())
  with check (exists (select 1 from service_requests sr
                       where sr.id = request_id and sr.customer_id = auth.uid())
              or is_admin());

create policy "customer own claim documents" on insurance_documents for all
  using (exists (select 1 from insurance_claims ic
                  join service_requests sr on sr.id = ic.request_id
                 where ic.id = claim_id and sr.customer_id = auth.uid())
         or is_admin())
  with check (exists (select 1 from insurance_claims ic
                       join service_requests sr on sr.id = ic.request_id
                      where ic.id = claim_id and sr.customer_id = auth.uid())
              or is_admin());

-- ---------- breakdown assistance ----------
create policy "customer own breakdowns" on breakdown_requests for all
  using (customer_id = auth.uid() or is_admin())
  with check (customer_id = auth.uid() or is_admin());
-- active garages see open breakdowns (dispatch marketplace),
-- dispatched garage keeps visibility for the job's lifetime
create policy "garage read open breakdowns" on breakdown_requests for select
  using (status = 'open' and is_active_garage_owner());
create policy "garage read dispatched breakdowns" on breakdown_requests for select
  using (dispatched_to_my_garage(id));

-- dispatch creation is server-side (admin/service role)
create policy "participants read dispatches" on dispatches for select
  using (owns_garage(garage_id) or is_admin()
         or exists (select 1 from breakdown_requests b
                     where b.id = breakdown_id and b.customer_id = auth.uid()));
create policy "garage update own dispatch" on dispatches for update
  using (owns_garage(garage_id))
  with check (owns_garage(garage_id));
create policy "admin manage dispatches" on dispatches for all using (is_admin());

-- ---------- fleet management ----------
create policy "fleet visible to owner and managers" on fleets for select
  using (owner_id = auth.uid() or in_fleet(id) or is_admin());
create policy "owner create fleet" on fleets for insert
  with check (owner_id = auth.uid());
create policy "owner update fleet" on fleets for update
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owner delete fleet" on fleets for delete
  using (owner_id = auth.uid());
create policy "admin manage fleets" on fleets for all using (is_admin());

create policy "fleet vehicles visible to fleet" on fleet_vehicles for select
  using (owns_fleet(fleet_id) or in_fleet(fleet_id) or is_admin());
create policy "owner manage fleet vehicles" on fleet_vehicles for all
  using (owns_fleet(fleet_id) or is_admin())
  with check (owns_fleet(fleet_id) or is_admin());

create policy "fleet managers visible to fleet" on fleet_managers for select
  using (user_id = auth.uid() or owns_fleet(fleet_id) or in_fleet(fleet_id) or is_admin());
create policy "owner manage fleet managers" on fleet_managers for all
  using (owns_fleet(fleet_id) or is_admin())
  with check (owns_fleet(fleet_id) or is_admin());

-- ---------- AI repair estimates (capture is service-role only) ----------
create policy "admin read training data" on repair_training_data for all using (is_admin());

create policy "customer read own predictions" on repair_predictions for select
  using (exists (select 1 from service_requests sr
                  where sr.id = request_id and sr.customer_id = auth.uid())
         or is_admin());
create policy "admin manage predictions" on repair_predictions for all using (is_admin());

-- ---------- parts marketplace (garage-facing catalogue; admin write) ----------
create policy "garages read suppliers" on suppliers for select
  using (is_active_garage_owner() or is_admin());
create policy "admin manage suppliers" on suppliers for all using (is_admin());

create policy "garages read parts" on parts for select
  using (is_active_garage_owner() or is_admin());
create policy "admin manage parts" on parts for all using (is_admin());

create policy "garages read inventory" on inventory for select
  using (is_active_garage_owner() or is_admin());
create policy "admin manage inventory" on inventory for all using (is_admin());

-- order fulfilment/status is server-side; garages create and read their own
create policy "garage read own orders" on orders for select
  using (owns_garage(garage_id) or is_admin());
create policy "garage place order" on orders for insert
  with check (owns_garage(garage_id));
create policy "admin manage orders" on orders for all using (is_admin());

-- ---------- EV charging directory (public read, admin write) ----------
create policy "public read charger types" on charger_types for select using (true);
create policy "admin manage charger types" on charger_types for all using (is_admin());

create policy "public read public stations" on charging_stations for select
  using (is_public or is_admin());
create policy "admin manage stations" on charging_stations for all using (is_admin());

create policy "chargers follow station" on charging_station_chargers for select
  using (exists (select 1 from charging_stations s where s.id = station_id)); -- visibility inherited via station RLS
create policy "admin manage station chargers" on charging_station_chargers for all using (is_admin());

create policy "public read charging reviews" on charging_reviews for select using (true);
create policy "user write own charging review" on charging_reviews for insert
  with check (user_id = auth.uid());
create policy "user update own charging review" on charging_reviews for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "user delete own charging review" on charging_reviews for delete
  using (user_id = auth.uid());
create policy "admin moderate charging reviews" on charging_reviews for all using (is_admin());

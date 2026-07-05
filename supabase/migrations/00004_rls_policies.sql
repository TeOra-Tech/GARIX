-- ============================================================
-- GARIX — Row Level Security
-- Customers: own profile / vehicles / requests / messages.
-- Garages:   own garage / quotes / wallet / messages.
-- Admins:    full access.
-- Writes with financial impact (credits, payments, quote acceptance)
-- go through security-definer RPCs or Edge Functions (service role).
-- ============================================================

-- ---------- Helpers ----------
create or replace function is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from user_profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function owns_garage(g uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from garages where id = g and owner_id = auth.uid());
$$;

-- ---------- Enable RLS everywhere ----------
do $$
declare t text;
begin
  foreach t in array array[
    'user_profiles','user_addresses','garages','garage_locations','garage_services',
    'garage_photos','garage_certifications','vehicle_makes','vehicle_models','vehicle_engines',
    'vehicles','vehicle_history','repair_categories','service_requests','request_attachments',
    'vat_rates','quotes','quote_items','vat_calculations','credit_wallets','credit_transactions',
    'credit_packs','payments','reviews','review_photos','conversations','messages',
    'notifications','notification_preferences','system_settings','audit_logs','disputes','reports'
  ] loop
    execute format('alter table %s enable row level security', t);
  end loop;
end $$;

-- ---------- user_profiles ----------
create policy "read own profile"   on user_profiles for select using (id = auth.uid() or is_admin());
create policy "update own profile" on user_profiles for update using (id = auth.uid()) with check (id = auth.uid() and role = (select role from user_profiles where id = auth.uid()));
create policy "admin manage profiles" on user_profiles for all using (is_admin());

-- ---------- user_addresses ----------
create policy "own addresses" on user_addresses for all
  using (user_id = auth.uid() or is_admin())
  with check (user_id = auth.uid() or is_admin());

-- ---------- garages ----------
create policy "public read active garages" on garages for select
  using (status = 'active' or owner_id = auth.uid() or is_admin());
create policy "owner insert garage" on garages for insert
  with check (owner_id = auth.uid());
create policy "owner update garage" on garages for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid()
              and status = (select status from garages g2 where g2.id = garages.id)); -- status changes via admin/RPC only
create policy "admin manage garages" on garages for all using (is_admin());

-- ---------- garage_locations / services / photos / certifications ----------
create policy "public read garage locations" on garage_locations for select using (true);
create policy "owner manage locations" on garage_locations for all
  using (owns_garage(garage_id) or is_admin()) with check (owns_garage(garage_id) or is_admin());

create policy "public read garage services" on garage_services for select using (true);
create policy "owner manage services" on garage_services for all
  using (owns_garage(garage_id) or is_admin()) with check (owns_garage(garage_id) or is_admin());

create policy "public read garage photos" on garage_photos for select using (true);
create policy "owner manage photos" on garage_photos for all
  using (owns_garage(garage_id) or is_admin()) with check (owns_garage(garage_id) or is_admin());

create policy "public read certifications" on garage_certifications for select using (true);
create policy "owner manage certifications" on garage_certifications for all
  using (owns_garage(garage_id) or is_admin()) with check (owns_garage(garage_id) or is_admin());

-- ---------- vehicle reference data (public read, admin write) ----------
create policy "public read makes"   on vehicle_makes   for select using (true);
create policy "public read models"  on vehicle_models  for select using (true);
create policy "public read engines" on vehicle_engines for select using (true);
create policy "admin manage makes"   on vehicle_makes   for all using (is_admin());
create policy "admin manage models"  on vehicle_models  for all using (is_admin());
create policy "admin manage engines" on vehicle_engines for all using (is_admin());

-- ---------- vehicles ----------
create policy "own vehicles" on vehicles for all
  using (owner_id = auth.uid() or is_admin())
  with check (owner_id = auth.uid() or is_admin());
-- garages may see the vehicle attached to requests they can see
create policy "garage read request vehicles" on vehicles for select
  using (exists (
    select 1 from service_requests sr
     where sr.vehicle_id = vehicles.id
       and sr.status in ('open','quoted','accepted','in_progress','completed')
       and exists (select 1 from garages g where g.owner_id = auth.uid() and g.status = 'active')));

create policy "own vehicle history" on vehicle_history for all
  using (exists (select 1 from vehicles v where v.id = vehicle_id and v.owner_id = auth.uid()) or is_admin())
  with check (exists (select 1 from vehicles v where v.id = vehicle_id and v.owner_id = auth.uid()) or is_admin());

-- ---------- repair taxonomy (public read) ----------
create policy "public read repair categories" on repair_categories for select using (true);
create policy "admin manage repair categories" on repair_categories for all using (is_admin());

-- ---------- service_requests ----------
create policy "customer own requests" on service_requests for all
  using (customer_id = auth.uid() or is_admin())
  with check (customer_id = auth.uid() or is_admin());
-- active garages can browse open marketplace requests
create policy "garage read open requests" on service_requests for select
  using (status in ('open','quoted')
         and exists (select 1 from garages g where g.owner_id = auth.uid() and g.status = 'active'));
-- garage that won the job keeps visibility
create policy "garage read own jobs" on service_requests for select
  using (exists (
    select 1 from quotes q
     where q.request_id = service_requests.id
       and q.status = 'accepted'
       and owns_garage(q.garage_id)));

create policy "request attachments follow request" on request_attachments for select
  using (exists (select 1 from service_requests sr where sr.id = request_id)); -- visibility inherited via request RLS
create policy "customer manage own attachments" on request_attachments for all
  using (exists (select 1 from service_requests sr where sr.id = request_id and sr.customer_id = auth.uid()) or is_admin())
  with check (exists (select 1 from service_requests sr where sr.id = request_id and sr.customer_id = auth.uid()) or is_admin());

-- ---------- vat_rates (public read, admin write) ----------
create policy "public read vat rates" on vat_rates for select using (true);
create policy "admin manage vat rates" on vat_rates for all using (is_admin());

-- ---------- quotes ----------
create policy "garage own quotes" on quotes for select
  using (owns_garage(garage_id) or is_admin());
create policy "customer read quotes on own requests" on quotes for select
  using (exists (select 1 from service_requests sr where sr.id = request_id and sr.customer_id = auth.uid()));
-- INSERT is denied to clients: quote submission spends credits and must go
-- through the submit-quote Edge Function (service role) atomically.
create policy "garage update own submitted quotes" on quotes for update
  using (owns_garage(garage_id) and status = 'submitted')
  with check (owns_garage(garage_id));
create policy "admin manage quotes" on quotes for all using (is_admin());

create policy "quote items follow quote" on quote_items for select
  using (exists (select 1 from quotes q where q.id = quote_id));
create policy "admin manage quote items" on quote_items for all using (is_admin());

create policy "vat calcs visible with quote" on vat_calculations for select
  using (exists (select 1 from quotes q where q.id = quote_id) or is_admin());

-- ---------- credits & payments ----------
create policy "garage read own wallet" on credit_wallets for select
  using (owns_garage(garage_id) or is_admin());
create policy "garage read own transactions" on credit_transactions for select
  using (owns_garage(garage_id) or is_admin());
-- wallet/transaction writes: service role only (spend_credits / add_credits RPCs)

create policy "public read credit packs" on credit_packs for select using (is_active or is_admin());
create policy "admin manage credit packs" on credit_packs for all using (is_admin());

create policy "garage read own payments" on payments for select
  using (owns_garage(garage_id) or is_admin());
-- payment writes: Stripe webhook Edge Function (service role) only

-- ---------- reviews ----------
create policy "public read visible reviews" on reviews for select
  using (not is_hidden or customer_id = auth.uid() or owns_garage(garage_id) or is_admin());
create policy "customer insert review for own completed job" on reviews for insert
  with check (
    customer_id = auth.uid()
    and exists (
      select 1 from service_requests sr
       where sr.id = request_id
         and sr.customer_id = auth.uid()
         and sr.status = 'completed'));
create policy "garage respond to review" on reviews for update
  using (owns_garage(garage_id))
  with check (owns_garage(garage_id));  -- app layer restricts editable columns to garage_response
create policy "admin moderate reviews" on reviews for all using (is_admin());

create policy "review photos follow review" on review_photos for select
  using (exists (select 1 from reviews r where r.id = review_id));
create policy "customer manage own review photos" on review_photos for all
  using (exists (select 1 from reviews r where r.id = review_id and r.customer_id = auth.uid()) or is_admin())
  with check (exists (select 1 from reviews r where r.id = review_id and r.customer_id = auth.uid()) or is_admin());

-- ---------- messaging ----------
create policy "participants read conversations" on conversations for select
  using (customer_id = auth.uid() or owns_garage(garage_id) or is_admin());
create policy "customer open conversation" on conversations for insert
  with check (customer_id = auth.uid());
create policy "participants update conversation" on conversations for update
  using (customer_id = auth.uid() or owns_garage(garage_id) or is_admin());

create policy "participants read messages" on messages for select
  using (exists (
    select 1 from conversations c
     where c.id = conversation_id
       and (c.customer_id = auth.uid() or owns_garage(c.garage_id)))
    or is_admin());
create policy "participants send messages" on messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from conversations c
       where c.id = conversation_id
         and c.status = 'active'
         and (c.customer_id = auth.uid() or owns_garage(c.garage_id))));
create policy "recipient mark read" on messages for update
  using (exists (
    select 1 from conversations c
     where c.id = conversation_id
       and (c.customer_id = auth.uid() or owns_garage(c.garage_id))));

-- ---------- notifications ----------
create policy "own notifications" on notifications for select using (user_id = auth.uid() or is_admin());
create policy "mark own notifications read" on notifications for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
-- notification inserts: service role (Edge Functions)

create policy "own notification prefs" on notification_preferences for all
  using (user_id = auth.uid() or is_admin())
  with check (user_id = auth.uid() or is_admin());

-- ---------- admin-only tables ----------
create policy "admin settings" on system_settings for all using (is_admin());
create policy "public read public settings" on system_settings for select
  using ((value->>'public')::boolean is true or is_admin());

create policy "admin read audit logs" on audit_logs for select using (is_admin());

create policy "participants and admin read disputes" on disputes for select
  using (opened_by = auth.uid() or is_admin()
         or exists (select 1 from service_requests sr where sr.id = request_id and sr.customer_id = auth.uid()));
create policy "user open dispute" on disputes for insert with check (opened_by = auth.uid());
create policy "admin manage disputes" on disputes for all using (is_admin());

create policy "user file report" on reports for insert with check (reporter_id = auth.uid());
create policy "user read own reports" on reports for select using (reporter_id = auth.uid() or is_admin());
create policy "admin manage reports" on reports for all using (is_admin());

-- ---------- Realtime ----------
alter publication supabase_realtime add table messages, notifications, quotes, service_requests;

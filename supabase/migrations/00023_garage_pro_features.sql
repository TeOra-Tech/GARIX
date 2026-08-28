-- ============================================================
-- GARIX — Garage Pro features: booking management, automated
-- reminders, garage-side vehicle service history, and analytics.
-- All gated to Pro (when plans.enabled) and to the garage owner.
-- ============================================================

-- ------------------------------------------------------------
-- Helpers
-- ------------------------------------------------------------
create or replace function plans_enabled()
returns boolean language sql stable set search_path = public as $$
  select coalesce((select (value->>'enabled')::boolean from system_settings where key = 'plans.enabled'), false);
$$;

-- Owner + Pro gate used by the Pro-only RPCs. Raises FORBIDDEN / PRO_REQUIRED.
create or replace function assert_garage_pro_access(p_garage_id uuid)
returns void language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  if not exists (select 1 from garages where id = p_garage_id and owner_id = auth.uid())
     and not is_admin() then
    raise exception 'FORBIDDEN';
  end if;
  if plans_enabled() and not garage_is_pro(p_garage_id) and not is_admin() then
    raise exception 'PRO_REQUIRED'
      using hint = 'This is a Pro feature. Upgrade this garage to Pro.';
  end if;
end $$;

-- ------------------------------------------------------------
-- 1. Booking management
-- ------------------------------------------------------------
create table bookings (
  id uuid primary key default uuid_generate_v4(),
  garage_id uuid not null references garages (id) on delete cascade,
  customer_id uuid references user_profiles (id) on delete set null,
  request_id uuid references service_requests (id) on delete set null,
  quote_id uuid references quotes (id) on delete set null,
  customer_name text,
  customer_phone text,
  vehicle_reg text,
  title text not null,
  scheduled_at timestamptz not null,
  duration_minutes int not null default 60 check (duration_minutes > 0),
  status text not null default 'scheduled'
    check (status in ('scheduled','confirmed','completed','cancelled','no_show')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_bookings_garage on bookings (garage_id, scheduled_at);
create index idx_bookings_customer on bookings (customer_id) where customer_id is not null;

alter table bookings enable row level security;
create trigger trg_bookings_updated before update on bookings
  for each row execute function set_updated_at();

create policy "bookings owner rw" on bookings for all
  using (owns_garage(garage_id) or is_admin())
  with check (
    (owns_garage(garage_id) and (not plans_enabled() or garage_is_pro(garage_id)))
    or is_admin()
  );
create policy "bookings customer read" on bookings for select
  using (customer_id = auth.uid());

-- ------------------------------------------------------------
-- 2. Automated reminders (garage → customer)
-- ------------------------------------------------------------
create table garage_reminders (
  id uuid primary key default uuid_generate_v4(),
  garage_id uuid not null references garages (id) on delete cascade,
  customer_id uuid references user_profiles (id) on delete set null,
  vehicle_reg text,
  customer_name text,
  reminder_type text not null default 'service' check (reminder_type in
    ('service','nct','oil_service','tyres','timing_belt','brake_fluid','insurance','road_tax','other')),
  title text,
  message text,
  due_date date not null,
  notify_customer boolean not null default true,
  last_notified_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_garage_reminders_garage on garage_reminders (garage_id, due_date);
create index idx_garage_reminders_due on garage_reminders (due_date) where completed_at is null;

alter table garage_reminders enable row level security;
create trigger trg_garage_reminders_updated before update on garage_reminders
  for each row execute function set_updated_at();

create policy "garage reminders owner rw" on garage_reminders for all
  using (owns_garage(garage_id) or is_admin())
  with check (
    (owns_garage(garage_id) and (not plans_enabled() or garage_is_pro(garage_id)))
    or is_admin()
  );

-- Daily processor: notify the customer (and the garage owner) when a garage
-- reminder falls due (within 7 days). Mirrors process_due_reminders (00018).
create or replace function process_garage_reminders()
returns int language plpgsql security definer set search_path = public as $$
declare
  r record;
  v_label text;
  v_owner uuid;
  n int := 0;
begin
  for r in
    select gr.*, g.owner_id, g.name as garage_name
      from garage_reminders gr
      join garages g on g.id = gr.garage_id
     where gr.completed_at is null
       and gr.last_notified_at is null
       and gr.due_date <= current_date + 7
       -- only Pro garages' reminders are automated
       and (not plans_enabled() or garage_is_pro(gr.garage_id))
  loop
    v_label := coalesce(nullif(trim(r.title), ''),
      case r.reminder_type
        when 'nct' then 'NCT' when 'oil_service' then 'Oil service'
        when 'tyres' then 'Tyres' when 'timing_belt' then 'Timing belt'
        when 'brake_fluid' then 'Brake fluid' when 'insurance' then 'Insurance'
        when 'road_tax' then 'Road tax' else 'Service' end);

    -- notify the customer if linked and opted in
    if r.notify_customer and r.customer_id is not null then
      insert into notifications (user_id, type, title, body, data)
      values (r.customer_id, 'system',
        v_label || ' reminder from ' || r.garage_name,
        coalesce(r.message,
          v_label || (case when r.vehicle_reg is not null then ' for ' || r.vehicle_reg else '' end)
          || ' is due on ' || to_char(r.due_date, 'DD Mon YYYY') || '.'),
        jsonb_build_object('kind', 'garage_reminder', 'garage_id', r.garage_id));
    end if;

    -- always notify the garage owner
    insert into notifications (user_id, type, title, body, data)
    values (r.owner_id, 'system',
      v_label || ' reminder due' || (case when r.customer_name is not null then ' — ' || r.customer_name else '' end),
      v_label || (case when r.vehicle_reg is not null then ' (' || r.vehicle_reg || ')' else '' end)
        || ' is due on ' || to_char(r.due_date, 'DD Mon YYYY') || '.',
      jsonb_build_object('kind', 'garage_reminder', 'reminder_id', r.id, 'link', '/dashboard/garages/' || r.garage_id || '/reminders'));

    update garage_reminders set last_notified_at = now() where id = r.id;
    n := n + 1;
  end loop;
  return n;
end $$;
revoke execute on function process_garage_reminders() from public, anon, authenticated;

do $$
begin
  perform cron.schedule('garage-reminders-daily', '0 8 * * *', 'select public.process_garage_reminders()');
exception when others then
  raise notice 'pg_cron unavailable, garage reminder job not scheduled: %', sqlerrm;
end $$;

-- ------------------------------------------------------------
-- 3. Garage-side vehicle service history
--    A garage may add / read service records for vehicles it has
--    actually serviced (an accepted quote on a request for that vehicle).
-- ------------------------------------------------------------
create or replace function garage_serviced_vehicle(p_garage_id uuid, p_vehicle_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from quotes q
      join service_requests sr on sr.id = q.request_id
     where q.garage_id = p_garage_id and q.status = 'accepted' and sr.vehicle_id = p_vehicle_id
  );
$$;

create or replace function get_garage_serviced_vehicles(p_garage_id uuid)
returns table (
  vehicle_id uuid, registration_number text, make text, model text, year int,
  jobs bigint, last_job_at timestamptz, record_count bigint
) language plpgsql stable security definer set search_path = public as $$
begin
  perform assert_garage_pro_access(p_garage_id);
  return query
  select v.id, v.registration_number,
         coalesce(mk.name, v.make_text), coalesce(md.name, v.model_text), v.year,
         count(distinct q.id),
         max(coalesce(sr.completed_at, q.updated_at)),
         (select count(*) from vehicle_history vh where vh.vehicle_id = v.id)
    from quotes q
    join service_requests sr on sr.id = q.request_id
    join vehicles v on v.id = sr.vehicle_id
    left join vehicle_makes mk on mk.id = v.make_id
    left join vehicle_models md on md.id = v.model_id
   where q.garage_id = p_garage_id and q.status = 'accepted'
   group by v.id, v.registration_number, mk.name, v.make_text, md.name, v.model_text, v.year
   order by max(coalesce(sr.completed_at, q.updated_at)) desc;
end $$;
grant execute on function get_garage_serviced_vehicles(uuid) to authenticated;

create or replace function get_garage_vehicle_history(p_garage_id uuid, p_vehicle_id uuid)
returns setof vehicle_history language plpgsql stable security definer set search_path = public as $$
begin
  perform assert_garage_pro_access(p_garage_id);
  if not garage_serviced_vehicle(p_garage_id, p_vehicle_id) then
    raise exception 'NOT_SERVICED';
  end if;
  return query
  select * from vehicle_history where vehicle_id = p_vehicle_id order by event_date desc, created_at desc;
end $$;
grant execute on function get_garage_vehicle_history(uuid, uuid) to authenticated;

create or replace function add_garage_service_record(
  p_garage_id uuid, p_vehicle_id uuid, p_event_type text, p_event_date date,
  p_title text default null, p_description text default null, p_parts_replaced text default null,
  p_mileage_km int default null, p_cost_eur numeric default null,
  p_warranty_until date default null, p_next_due_date date default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_garage_name text;
begin
  perform assert_garage_pro_access(p_garage_id);
  if not garage_serviced_vehicle(p_garage_id, p_vehicle_id) then
    raise exception 'NOT_SERVICED';
  end if;
  select name into v_garage_name from garages where id = p_garage_id;
  insert into vehicle_history (
    vehicle_id, event_type, event_date, title, description, parts_replaced,
    mileage_km, cost_eur, warranty_until, next_due_date, garage_id, garage_name, created_by
  ) values (
    p_vehicle_id, p_event_type, p_event_date, p_title, p_description, p_parts_replaced,
    p_mileage_km, p_cost_eur, p_warranty_until, p_next_due_date, p_garage_id, v_garage_name, auth.uid()
  ) returning id into v_id;
  return v_id;
end $$;
grant execute on function add_garage_service_record(uuid, uuid, text, date, text, text, text, int, numeric, date, date) to authenticated;

-- Let the vehicle owner see records a garage added (garage_id set).
-- (Owner already sees all rows via "own vehicle history"; nothing to change —
--  garage-authored rows carry garage_id/garage_name so the owner sees who did it.)

-- ------------------------------------------------------------
-- 4. Garage analytics
-- ------------------------------------------------------------
create or replace function get_garage_analytics(p_garage_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v jsonb;
begin
  perform assert_garage_pro_access(p_garage_id);
  select jsonb_build_object(
    'quotes_total',    (select count(*) from quotes where garage_id = p_garage_id),
    'quotes_accepted', (select count(*) from quotes where garage_id = p_garage_id and status = 'accepted'),
    'quotes_rejected', (select count(*) from quotes where garage_id = p_garage_id and status = 'rejected'),
    'quotes_30d',      (select count(*) from quotes where garage_id = p_garage_id and created_at >= now() - interval '30 days'),
    'accepted_30d',    (select count(*) from quotes where garage_id = p_garage_id and status = 'accepted' and updated_at >= now() - interval '30 days'),
    'jobs_completed',  (select count(*) from quotes q join service_requests sr on sr.id = q.request_id
                         where q.garage_id = p_garage_id and q.status = 'accepted' and sr.status = 'completed'),
    'total_job_value', coalesce((select sum(q.grand_total) from quotes q join service_requests sr on sr.id = q.request_id
                         where q.garage_id = p_garage_id and q.status = 'accepted' and sr.status = 'completed'), 0),
    'avg_quote_value', coalesce((select round(avg(grand_total)::numeric, 2) from quotes where garage_id = p_garage_id), 0),
    'avg_rating',      coalesce((select round(avg(rating_overall)::numeric, 2) from reviews where garage_id = p_garage_id and not is_hidden), 0),
    'review_count',    (select count(*) from reviews where garage_id = p_garage_id and not is_hidden),
    'credits_spent',   coalesce((select sum(credits_charged) from quotes where garage_id = p_garage_id), 0),
    'customers',       (select count(distinct sr.customer_id) from quotes q join service_requests sr on sr.id = q.request_id
                         where q.garage_id = p_garage_id and q.status = 'accepted'),
    'bookings_upcoming', (select count(*) from bookings where garage_id = p_garage_id
                         and status in ('scheduled','confirmed') and scheduled_at >= now())
  ) into v;
  return v;
end $$;
grant execute on function get_garage_analytics(uuid) to authenticated;

-- ============================================================
-- GARIX — Vehicle care: digital service history, maintenance
-- reminders, vehicle photo, ownership transfer.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Vehicle photo ("profile picture" for the car)
--    Stored in the existing private vehicle-images bucket under
--    {owner_id}/{vehicle_id}/... per the storage path convention.
-- ------------------------------------------------------------
alter table vehicles add column photo_path text;

-- ------------------------------------------------------------
-- 2. Digital service history
--    vehicle_history already exists (event_type/event_date/mileage/
--    description/garage_id) with owner-scoped RLS. Extend it into a
--    full service record: parts, cost, warranty, next-due interval.
--    event_type stays free text; the app writes values such as
--    'engine_service','gearbox_service','oil_service','parts_replaced',
--    'tyres','brakes','timing_belt','nct','repair','service',
--    'ownership_change','other'.
-- ------------------------------------------------------------
alter table vehicle_history
  add column title text,
  add column parts_replaced text,
  add column cost_eur numeric(10,2) check (cost_eur >= 0),
  add column warranty_until date,
  add column next_due_date date,
  add column next_due_mileage_km int check (next_due_mileage_km >= 0),
  add column garage_name text,   -- free text for work done outside Garix
  add column created_by uuid references user_profiles (id);

create index idx_vehicle_history_vehicle on vehicle_history (vehicle_id, event_date desc);

-- ------------------------------------------------------------
-- 3. Service & maintenance reminders
-- ------------------------------------------------------------
create table vehicle_reminders (
  id uuid primary key default uuid_generate_v4(),
  vehicle_id uuid not null references vehicles (id) on delete cascade,
  reminder_type text not null check (reminder_type in
    ('oil_service','nct','tyres','timing_belt','brake_fluid',
     'insurance','road_tax','service','other')),
  title text,                                   -- custom label (mainly for 'other')
  due_date date not null,
  due_mileage_km int check (due_mileage_km >= 0),
  interval_months int check (interval_months > 0),  -- recurring: roll forward on completion
  notes text,
  last_notified_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_vehicle_reminders_vehicle on vehicle_reminders (vehicle_id, due_date);
create index idx_vehicle_reminders_due on vehicle_reminders (due_date) where completed_at is null;

alter table vehicle_reminders enable row level security;
create policy "own vehicle reminders" on vehicle_reminders for all
  using (exists (select 1 from vehicles v where v.id = vehicle_id and v.owner_id = auth.uid()) or is_admin())
  with check (exists (select 1 from vehicles v where v.id = vehicle_id and v.owner_id = auth.uid()) or is_admin());

-- Re-arm the notification when the due date moves (and keep updated_at fresh).
create or replace function vehicle_reminder_touch()
returns trigger language plpgsql as $$
begin
  if new.due_date is distinct from old.due_date then
    new.last_notified_at := null;
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger trg_vehicle_reminders_touch
  before update on vehicle_reminders
  for each row execute function vehicle_reminder_touch();

-- Daily processor: one in-app notification (fanned out to email/SMS by the
-- existing notifications trigger) when a reminder enters its 14-day window.
create or replace function process_due_reminders()
returns int language plpgsql security definer set search_path = public as $$
declare
  r record;
  v_label text;
  n int := 0;
begin
  for r in
    select vr.id, vr.reminder_type, vr.title, vr.due_date,
           v.owner_id, v.registration_number
      from vehicle_reminders vr
      join vehicles v on v.id = vr.vehicle_id
     where vr.completed_at is null
       and vr.last_notified_at is null
       and vr.due_date <= current_date + 14
  loop
    v_label := coalesce(nullif(trim(r.title), ''),
      case r.reminder_type
        when 'oil_service' then 'Oil service'
        when 'nct'         then 'NCT'
        when 'tyres'       then 'Tyres'
        when 'timing_belt' then 'Timing belt'
        when 'brake_fluid' then 'Brake fluid'
        when 'insurance'   then 'Insurance renewal'
        when 'road_tax'    then 'Road tax'
        when 'service'     then 'Service'
        else 'Maintenance'
      end);
    insert into notifications (user_id, type, title, body, data)
    values (
      r.owner_id, 'system',
      v_label || ' due for ' || r.registration_number,
      case when r.due_date < current_date
        then v_label || ' was due on ' || to_char(r.due_date, 'DD Mon YYYY') || '. Post a request on Garix to get quotes from local garages.'
        else v_label || ' is due on ' || to_char(r.due_date, 'DD Mon YYYY') || '. Post a request on Garix to get quotes from local garages.'
      end,
      jsonb_build_object('kind', 'vehicle_reminder', 'reminder_id', r.id, 'link', '/dashboard/vehicles')
    );
    update vehicle_reminders set last_notified_at = now() where id = r.id;
    n := n + 1;
  end loop;
  return n;
end $$;

-- Server-side only: cron (below) and service role run it, clients never do.
revoke execute on function process_due_reminders() from public, anon, authenticated;

-- Schedule daily at 08:00 UTC. Guarded: pg_cron is present on hosted Supabase
-- and in the local dev image, but the migration must not fail if it isn't.
do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule('vehicle-reminders-daily', '0 8 * * *',
                        'select public.process_due_reminders()');
exception when others then
  raise notice 'pg_cron unavailable, reminder job not scheduled: %', sqlerrm;
end $$;

-- ------------------------------------------------------------
-- 4. Ownership transfer — the service history travels with the car.
--    All writes go through security-definer RPCs; clients only read.
-- ------------------------------------------------------------
create table vehicle_transfers (
  id uuid primary key default uuid_generate_v4(),
  vehicle_id uuid not null references vehicles (id) on delete cascade,
  from_user_id uuid not null references user_profiles (id),
  to_user_id uuid not null references user_profiles (id),
  vehicle_label text not null,   -- snapshot: recipient can't read the vehicle row pre-accept
  status text not null default 'pending'
    check (status in ('pending','accepted','declined','cancelled')),
  created_at timestamptz not null default now(),
  responded_at timestamptz
);
create unique index uniq_vehicle_transfer_pending on vehicle_transfers (vehicle_id) where status = 'pending';
create index idx_vehicle_transfers_to on vehicle_transfers (to_user_id, status);

alter table vehicle_transfers enable row level security;
create policy "transfer parties read" on vehicle_transfers for select
  using (from_user_id = auth.uid() or to_user_id = auth.uid() or is_admin());
-- no insert/update/delete policies: writes happen via the RPCs below

create or replace function initiate_vehicle_transfer(p_vehicle_id uuid, p_to_email text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_caller uuid := auth.uid();
  v_vehicle vehicles%rowtype;
  v_to uuid;
  v_label text;
  v_transfer_id uuid;
  v_from_name text;
begin
  if v_caller is null then
    raise exception 'Not signed in';
  end if;
  select * into v_vehicle from vehicles where id = p_vehicle_id;
  if not found or v_vehicle.owner_id <> v_caller then
    raise exception 'You can only transfer your own vehicle';
  end if;
  select id into v_to from user_profiles
   where lower(email) = lower(trim(p_to_email));
  if not found then
    raise exception 'No Garix account found for that email';
  end if;
  if v_to = v_caller then
    raise exception 'That vehicle already belongs to this account';
  end if;

  v_label := trim(concat_ws(' ', v_vehicle.year::text,
                            coalesce((select name from vehicle_makes where id = v_vehicle.make_id), v_vehicle.make_text),
                            coalesce((select name from vehicle_models where id = v_vehicle.model_id), v_vehicle.model_text)));
  v_label := coalesce(nullif(v_label, ''), 'Vehicle') || ' · ' || v_vehicle.registration_number;

  insert into vehicle_transfers (vehicle_id, from_user_id, to_user_id, vehicle_label)
  values (p_vehicle_id, v_caller, v_to, v_label)
  returning id into v_transfer_id;

  select full_name into v_from_name from user_profiles where id = v_caller;
  insert into notifications (user_id, type, title, body, data)
  values (v_to, 'system',
          'Vehicle transfer offer',
          coalesce(v_from_name, 'A Garix user') || ' wants to transfer ' || v_label ||
          ' to you, including its full service history. Accept or decline under My vehicles.',
          jsonb_build_object('kind', 'vehicle_transfer', 'transfer_id', v_transfer_id, 'link', '/dashboard/vehicles'));

  return v_transfer_id;
end $$;

create or replace function respond_vehicle_transfer(p_transfer_id uuid, p_accept boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_caller uuid := auth.uid();
  v_t vehicle_transfers%rowtype;
  v_reg text;
begin
  if v_caller is null then
    raise exception 'Not signed in';
  end if;
  select * into v_t from vehicle_transfers where id = p_transfer_id for update;
  if not found or v_t.to_user_id <> v_caller then
    raise exception 'Transfer not found';
  end if;
  if v_t.status <> 'pending' then
    raise exception 'This transfer has already been resolved';
  end if;

  if p_accept then
    select registration_number into v_reg from vehicles where id = v_t.vehicle_id;
    if exists (select 1 from vehicles
                where owner_id = v_caller and registration_number = v_reg) then
      raise exception 'You already have a vehicle with registration %', v_reg;
    end if;
    -- history rows stay attached to the vehicle, so the new owner
    -- inherits the full digital service history via owner-scoped RLS.
    update vehicles
       set owner_id = v_caller,
           photo_path = null   -- old photo lives in the previous owner's folder
     where id = v_t.vehicle_id;
    insert into vehicle_history (vehicle_id, event_type, event_date, description, created_by)
    values (v_t.vehicle_id, 'ownership_change', current_date,
            'Ownership transferred on Garix', v_caller);
    update vehicle_transfers
       set status = 'accepted', responded_at = now()
     where id = p_transfer_id;
    insert into notifications (user_id, type, title, body, data)
    values (v_t.from_user_id, 'system', 'Vehicle transfer accepted',
            v_t.vehicle_label || ' has been transferred to its new owner.',
            jsonb_build_object('kind', 'vehicle_transfer', 'transfer_id', p_transfer_id));
  else
    update vehicle_transfers
       set status = 'declined', responded_at = now()
     where id = p_transfer_id;
    insert into notifications (user_id, type, title, body, data)
    values (v_t.from_user_id, 'system', 'Vehicle transfer declined',
            'The transfer of ' || v_t.vehicle_label || ' was declined.',
            jsonb_build_object('kind', 'vehicle_transfer', 'transfer_id', p_transfer_id));
  end if;
end $$;

create or replace function cancel_vehicle_transfer(p_transfer_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_caller uuid := auth.uid();
begin
  update vehicle_transfers
     set status = 'cancelled', responded_at = now()
   where id = p_transfer_id and from_user_id = v_caller and status = 'pending';
  if not found then
    raise exception 'Transfer not found';
  end if;
end $$;

-- Signed-in users only; the functions enforce ownership internally.
revoke execute on function initiate_vehicle_transfer(uuid, text) from public, anon;
revoke execute on function respond_vehicle_transfer(uuid, boolean) from public, anon;
revoke execute on function cancel_vehicle_transfer(uuid) from public, anon;
grant execute on function initiate_vehicle_transfer(uuid, text) to authenticated;
grant execute on function respond_vehicle_transfer(uuid, boolean) to authenticated;
grant execute on function cancel_vehicle_transfer(uuid) to authenticated;

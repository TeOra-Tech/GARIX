-- ============================================================
-- GARIX — NCT, motor tax, insurance and service reminders
--
-- Notice schedule (days before the expiry / due date):
--   NCT        30, 7   (the 30-day notice mentions that a test up to 90 days early loses no time)
--              120, 30, 7 when the NCT runs out on the car's 10th anniversary of first
--              registration. Official rule (ncts.ie): tests every 2 years until the
--              10th-anniversary test, then yearly — but a car that passes MORE than 90 days
--              before its due date (voluntary early testing) gets a fresh certificate by its
--              age on the pass date, so it can still get 2 years one last time. The 120-day
--              notice explains this and gives the last day to pass.
--   Motor tax  14, 7
--   Insurance  30, 7
--   Service    14, 7
-- Then for all four: a notice on the last day, a "you don't have …" notice the day after,
-- and the same notice every Monday at 09:00 until the user enters the renewal (a new
-- expiry date) or marks the reminder done.
--
-- Everything goes out at 09:00 Irish time: the job runs hourly and only acts at 09:00
-- Europe/Dublin, so summer time is handled.
--
-- Consumables (oil, tyres, timing belt, brake fluid, other) have no fixed period: the app
-- no longer offers them and this job no longer sends notices for older rows of those types.
-- ============================================================

-- Date of first registration: NCT tests fall due on its anniversaries (vehicles.year stays
-- for cars added without it; the app sets year from this date when it's given).
alter table vehicles
  add column first_registration_date date check (first_registration_date >= '1950-01-01');

-- NCT test date / insurance or tax start, and the length bought (tax 3/6/12, insurance 12).
alter table vehicle_reminders
  add column start_date date,
  add column duration_months int check (duration_months between 1 and 24);

-- One row per notice sent, keyed by the expiry it was about: entering a renewal (new
-- due_date) starts a fresh schedule, and the job can never send the same notice twice.
create table vehicle_reminder_notices (
  reminder_id uuid not null references vehicle_reminders (id) on delete cascade,
  due_date    date not null,
  stage       text not null,   -- before_120 | before_30 | before_14 | before_7 | last_day | expired | weekly_YYYY-MM-DD
  sent_at     timestamptz not null default now(),
  primary key (reminder_id, due_date, stage)
);

alter table vehicle_reminder_notices enable row level security;
create policy "own reminder notices" on vehicle_reminder_notices for select
  using (exists (
    select 1 from vehicle_reminders vr join vehicles v on v.id = vr.vehicle_id
     where vr.id = reminder_id and (v.owner_id = auth.uid() or is_admin())
  ));
revoke all on vehicle_reminder_notices from anon, authenticated;
grant select on vehicle_reminder_notices to authenticated;

drop function if exists process_due_reminders();

create or replace function process_due_reminders(p_force boolean default false)
returns int language plpgsql security definer set search_path = public as $$
declare
  v_now    timestamp := now() at time zone 'Europe/Dublin';
  v_today  date := (now() at time zone 'Europe/Dublin')::date;
  r        record;
  v_label  text;
  v_days   int;
  v_offsets int[];
  v_o      int;
  v_stage  text;
  v_title  text;
  v_body   text;
  v_date   text;
  v_last2  boolean;
  n        int := 0;
begin
  -- Notices go out at 09:00 Irish time (the cron job runs every hour).
  if not p_force and extract(hour from v_now) <> 9 then
    return 0;
  end if;

  -- ---------- NCT, motor tax, insurance, service ----------
  for r in
    select vr.id, vr.reminder_type, vr.due_date, vr.vehicle_id, v.owner_id, v.registration_number, v.year,
           v.first_registration_date
      from vehicle_reminders vr
      join vehicles v on v.id = vr.vehicle_id
     where vr.completed_at is null
       and vr.reminder_type in ('nct', 'road_tax', 'insurance', 'service')
       and vr.due_date <= v_today + 120
  loop
    v_days  := r.due_date - v_today;
    v_date  := trim(to_char(r.due_date, 'FMDD FMMonth YYYY'));
    v_label := case r.reminder_type
      when 'nct' then 'NCT' when 'road_tax' then 'motor tax' when 'insurance' then 'insurance' else 'service' end;
    -- The NCT runs out on the car's 10th anniversary (exact with the registration date,
    -- by calendar year otherwise).
    v_last2 := r.reminder_type = 'nct' and case
      when r.first_registration_date is not null
        then extract(year from age(r.due_date, r.first_registration_date))::int = 10
      when r.year is not null
        then extract(year from r.due_date)::int - r.year = 10
      else false
    end;
    v_offsets := case
      when v_last2 then array[120, 30, 7]
      when r.reminder_type in ('nct', 'insurance') then array[30, 7]
      else array[14, 7]
    end;
    v_stage := null;

    if v_days > 0 then
      -- The closest notice window we're in (a reminder added late skips the earlier ones).
      select min(o) into v_o from unnest(v_offsets) o where o >= v_days;
      if v_o is null then continue; end if;
      v_stage := 'before_' || v_o;
      if r.reminder_type = 'service' then
        v_title := 'Service due in ' || v_days || ' day' || case when v_days = 1 then '' else 's' end || ' – ' || r.registration_number;
        v_body  := 'The service for ' || r.registration_number || ' is due on ' || v_date || '. Post a request on Garix to get quotes from local garages.';
      else
        v_title := initcap(left(v_label, 1)) || substr(v_label, 2) || ' expires in ' || v_days || ' day' || case when v_days = 1 then '' else 's' end || ' – ' || r.registration_number;
        v_body  := 'The ' || v_label || ' for ' || r.registration_number || ' expires on ' || v_date || '. When you''ve renewed, add the new dates in Garix.';
      end if;
      if v_last2 and v_o = 120 then
        v_body := v_body || ' Your car turns 10 when this NCT runs out. If it passes the NCT more than 90 days before '
          || v_date || ' (by ' || trim(to_char(r.due_date - 91, 'FMDD FMMonth YYYY'))
          || '), it gets a 2-year certificate for the last time. If it''s tested later than that, it gets 1 year and is tested every year from then on.';
      elsif r.reminder_type = 'nct' and v_o = 30 then
        v_body := v_body || ' You can take the test up to 90 days before it expires without losing any time on your certificate.';
      end if;
    elsif v_days = 0 then
      v_stage := 'last_day';
      if r.reminder_type = 'service' then
        v_title := 'Service due today – ' || r.registration_number;
        v_body  := 'Today is the last day of the service interval for ' || r.registration_number || '. Once it''s done, add it in Garix so we stop reminding you.';
      else
        v_title := 'Last day of your ' || v_label || ' – ' || r.registration_number;
        v_body  := 'Today is the last day of the ' || v_label || ' for ' || r.registration_number || '. Once you''ve renewed, add the new dates in Garix so we stop reminding you.';
      end if;
    else
      if not exists (select 1 from vehicle_reminder_notices
                      where reminder_id = r.id and due_date = r.due_date and stage = 'expired') then
        v_stage := 'expired';
      elsif extract(isodow from v_today) = 1
        and not exists (select 1 from vehicle_reminder_notices
                         where reminder_id = r.id and due_date = r.due_date
                           and (sent_at at time zone 'Europe/Dublin')::date = v_today) then
        -- Every Monday, but not on the same day as the "expired" notice.
        v_stage := 'weekly_' || to_char(v_today, 'YYYY-MM-DD');
      end if;
      if v_stage is not null then
        if r.reminder_type = 'service' then
          v_title := 'Your service is overdue – ' || r.registration_number;
          v_body  := 'You don''t have a current service for ' || r.registration_number || ' (it was due on ' || v_date || '). Please book one, then add it in Garix to stop these reminders.';
        else
          v_title := 'You don''t have ' || v_label || ' – ' || r.registration_number;
          v_body  := 'You don''t have ' || v_label || ' for ' || r.registration_number || ' (it ran out on ' || v_date || '). Please renew, then add the new dates in Garix to stop these reminders.';
        end if;
      end if;
    end if;

    if v_stage is null then continue; end if;
    -- Claim the notice first; if it was already sent, skip.
    insert into vehicle_reminder_notices (reminder_id, due_date, stage)
    values (r.id, r.due_date, v_stage)
    on conflict do nothing;
    if not found then continue; end if;
    -- Mark the earlier windows as passed, so a late-added reminder doesn't send them later.
    if v_stage like 'before_%' then
      insert into vehicle_reminder_notices (reminder_id, due_date, stage)
      select r.id, r.due_date, 'before_' || o from unnest(v_offsets) o where o > v_o
      on conflict do nothing;
    end if;

    insert into notifications (user_id, type, title, body, data)
    values (
      r.owner_id, 'system', v_title, v_body,
      jsonb_build_object('kind', 'vehicle_reminder', 'reminder_id', r.id, 'stage', v_stage,
                         'link', '/dashboard/vehicles/' || r.vehicle_id)
    );
    update vehicle_reminders set last_notified_at = now() where id = r.id;
    n := n + 1;
  end loop;

  return n;
end $$;

revoke execute on function process_due_reminders(boolean) from public, anon, authenticated;

-- Hourly instead of daily; the function itself waits for 09:00 Irish time.
do $$
begin
  begin
    perform cron.unschedule('vehicle-reminders-daily');
  exception when others then null;
  end;
  perform cron.schedule('vehicle-reminders-hourly', '0 * * * *', 'select public.process_due_reminders()');
exception when others then
  raise notice 'pg_cron unavailable, reminder job not scheduled: %', sqlerrm;
end $$;

-- Feature 9: notifications fan-out plumbing.
-- Every notifications INSERT is forwarded (async, via pg_net) to the
-- notify-fanout Edge Function, which emails/SMSes per notification_preferences.
-- The call carries a shared secret from system_settings; the real value is set
-- operationally (and mirrored into the function's env) — the placeholder here
-- keeps the migration deterministic for local resets.

create extension if not exists pg_net;

insert into system_settings (key, value, description) values
  ('internal.fanout_url',
   jsonb_build_object('url', 'https://vyeidmrhptswqupkghcu.supabase.co/functions/v1/notify-fanout', 'public', false),
   'notify-fanout Edge Function endpoint'),
  ('internal.fanout_secret',
   jsonb_build_object('secret', 'set-operationally', 'public', false),
   'Shared secret authenticating notifications fan-out calls')
on conflict (key) do nothing;

create or replace function notify_fanout_dispatch()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_url text;
  v_secret text;
begin
  select value->>'url' into v_url from system_settings where key = 'internal.fanout_url';
  select value->>'secret' into v_secret from system_settings where key = 'internal.fanout_secret';
  if v_url is not null and v_secret is not null then
    perform net.http_post(
      url := v_url,
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-fanout-secret', v_secret),
      body := jsonb_build_object('notification_id', new.id)
    );
  end if;
  return new;
exception when others then
  -- fan-out must never block the notification insert itself
  return new;
end $$;

create trigger trg_notifications_fanout
  after insert on notifications
  for each row execute function notify_fanout_dispatch();

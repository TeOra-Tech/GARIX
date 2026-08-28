-- plans_enabled() read the 'plans.enabled' setting as the calling user, but
-- system_settings only exposes rows flagged {"public": true} to non-admins.
-- So the flag was invisible to (a) the RLS WITH CHECK on bookings/garage_reminders
-- and (b) the client. Make it SECURITY DEFINER and callable by clients so both
-- the server-side gate and the UI see the real value.
create or replace function plans_enabled()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select (value->>'enabled')::boolean from system_settings where key = 'plans.enabled'), false);
$$;

grant execute on function plans_enabled() to anon, authenticated;

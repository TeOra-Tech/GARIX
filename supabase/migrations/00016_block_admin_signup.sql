-- CRITICAL: handle_new_user copied `role` verbatim from raw_user_meta_data,
-- and signup metadata is client-controlled — so any visitor could register
-- with {"role":"admin"} and pass every is_admin() check. Self-signup may only
-- yield customer or garage_owner; admins are promoted by an existing admin
-- (or the service role) via user_profiles.role.

create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_requested text := new.raw_user_meta_data->>'role';
  v_role user_role;
begin
  v_role := case
    when v_requested in ('customer', 'garage_owner') then v_requested::user_role
    else 'customer'
  end;

  insert into user_profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.email, ''),
    v_role
  );
  insert into notification_preferences (user_id) values (new.id);
  return new;
end $$;

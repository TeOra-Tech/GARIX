-- ============================================================
-- GARIX — Fleet management: business accounts with unlimited
-- vehicles on a per-vehicle monthly subscription, and a hard
-- 3-vehicle cap for individual (free) customer accounts.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Account tier on the customer profile.
--    role stays 'customer' (fleet uses the customer portal);
--    account_type drives the vehicle cap and billing.
-- ------------------------------------------------------------
alter table user_profiles
  add column account_type text not null default 'individual'
  check (account_type in ('individual', 'fleet'));

-- ------------------------------------------------------------
-- 2. Fleet subscription billing state.
--    Mirrors the Stripe subscription. Money moves server-side
--    only: clients may READ their own row; all writes come from
--    the service role (Stripe webhook / billing routes).
-- ------------------------------------------------------------
create table fleet_subscriptions (
  user_id uuid primary key references user_profiles (id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text unique,
  stripe_item_id text,
  status text not null default 'incomplete'
    check (status in ('incomplete','incomplete_expired','trialing','active',
                      'past_due','canceled','unpaid','paused')),
  price_per_vehicle_cents int not null default 500,
  quantity int not null default 0,               -- billed vehicle slots
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table fleet_subscriptions enable row level security;
create policy "own fleet subscription read" on fleet_subscriptions for select
  using (user_id = auth.uid() or is_admin());
-- deliberately no insert/update/delete policies: only the service role writes.

create trigger trg_fleet_subscriptions_updated
  before update on fleet_subscriptions
  for each row execute function set_updated_at();

-- Good standing to add a vehicle? (active or trialing subscription)
create or replace function fleet_can_add(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from fleet_subscriptions
     where user_id = p_user and status in ('active', 'trialing')
  );
$$;

-- ------------------------------------------------------------
-- 3. Vehicle-count enforcement.
--    Individual/other customers: hard cap of 3 vehicles.
--    Fleet: unlimited, but only while billing is in good standing.
--    Admins: unlimited. Enforced on INSERT and on ownership
--    transfer-in (UPDATE OF owner_id) so a transfer can't push an
--    individual over the cap.
-- ------------------------------------------------------------
create or replace function enforce_vehicle_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_role user_role;
  v_type text;
  v_count int;
begin
  -- on transfer, only act when the owner actually changes
  if tg_op = 'UPDATE' and new.owner_id = old.owner_id then
    return new;
  end if;

  select role, account_type into v_role, v_type
    from user_profiles where id = new.owner_id;

  if v_role = 'admin' then
    return new;
  end if;

  if v_type = 'fleet' then
    if not fleet_can_add(new.owner_id) then
      raise exception 'FLEET_BILLING_REQUIRED'
        using hint = 'Set up or update fleet billing before adding vehicles.';
    end if;
    return new;
  end if;

  -- individuals (and any non-fleet, non-admin) are capped at 3
  select count(*) into v_count from vehicles where owner_id = new.owner_id;
  if v_count >= 3 then
    raise exception 'VEHICLE_LIMIT_REACHED'
      using hint = 'Individual accounts hold up to 3 vehicles. Upgrade to a Fleet account for unlimited vehicles.';
  end if;
  return new;
end $$;

create trigger trg_vehicles_limit
  before insert or update of owner_id on vehicles
  for each row execute function enforce_vehicle_limit();

-- ------------------------------------------------------------
-- 4. Let self-signup set the account tier (fleet sign-up path).
--    Still clamps role to customer/garage_owner (never admin,
--    per 00016). Fleet only applies to customers.
-- ------------------------------------------------------------
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_requested text := new.raw_user_meta_data->>'role';
  v_role user_role;
  v_type text := case
    when new.raw_user_meta_data->>'account_type' = 'fleet' then 'fleet'
    else 'individual'
  end;
begin
  v_role := case
    when v_requested in ('customer', 'garage_owner') then v_requested::user_role
    else 'customer'
  end;
  if v_role <> 'customer' then
    v_type := 'individual';
  end if;

  insert into user_profiles (id, full_name, email, role, account_type)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.email, ''),
    v_role,
    v_type
  );
  insert into notification_preferences (user_id) values (new.id);
  return new;
end $$;

-- ------------------------------------------------------------
-- 5. Fleet pricing settings (price id set operationally after the
--    Stripe Price is created).
-- ------------------------------------------------------------
insert into system_settings (key, value, description) values
  ('fleet.price_per_vehicle',
   jsonb_build_object('cents', 500, 'currency', 'eur', 'interval', 'month'),
   'Fleet: monthly price charged per vehicle'),
  ('fleet.stripe_price_id',
   jsonb_build_object('id', 'set-operationally'),
   'Stripe Price id for the fleet per-vehicle recurring subscription')
on conflict (key) do nothing;

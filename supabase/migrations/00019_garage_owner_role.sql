-- Registering a garage never promoted the owner's profile to 'garage_owner',
-- so accounts that signed up as customers and then registered a garage kept
-- the customer role — and the role-split dashboard showed them the customer
-- portal. Promote on garage creation (never demote, never touch admins),
-- and backfill the accounts already affected.

create or replace function handle_new_garage()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into credit_wallets (garage_id) values (new.id);
  update user_profiles
     set role = 'garage_owner'
   where id = new.owner_id and role = 'customer';
  return new;
end $$;

update user_profiles up
   set role = 'garage_owner'
 where up.role = 'customer'
   and exists (select 1 from garages g where g.owner_id = up.id);

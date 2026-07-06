-- handle_new_garage() ran with the caller's privileges, so the credit_wallets
-- insert it performs was blocked by RLS for every non-admin — making garage
-- registration impossible from the client. Recreate it as security definer,
-- mirroring handle_new_user(). The trigger stays the only wallet writer besides
-- the money RPCs, so rule "money moves only server-side" is preserved.

create or replace function handle_new_garage()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into credit_wallets (garage_id) values (new.id);
  return new;
end $$;

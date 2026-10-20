-- 00028_account_deletion
-- Self-service account deletion (GDPR Art. 17; App Store 5.1.1(v); Google Play).
--
-- Flow (src/app/api/account/delete/route.ts):
--   1. account_deletion_blockers()  — reasons the caller can't self-delete yet.
--   2. Storage files under {user_id}/ are removed through the Storage API.
--   3. delete_my_account_data()     — re-checks blockers, deletes the caller's
--      requests (cascading quotes, reviews, attachments) and vehicles.
--   4. auth.admin.deleteUser()      — cascades user_profiles and everything
--      keyed on it (addresses, conversations, messages, notifications, …).
--
-- Kept on purpose (Data Retention Policy): the garage credit ledger and
-- payments (6 years, keyed on garages, not the customer), audit logs, and
-- dispute/report records — those lose their user link instead of disappearing.

-- ---------------------------------------------------------------------------
-- 1. Foreign keys that would block deleting a user_profiles row.
-- ---------------------------------------------------------------------------
create or replace function pg_temp.repoint_fk(p_table text, p_column text, p_ref text, p_rule text)
returns void language plpgsql as $$
declare
  v_name text;
begin
  select c.conname into v_name
  from pg_constraint c
  join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
  where c.contype = 'f'
    and c.conrelid = format('public.%I', p_table)::regclass
    and a.attname = p_column
    and array_length(c.conkey, 1) = 1;
  if v_name is null then
    raise exception 'No foreign key on %.%', p_table, p_column;
  end if;
  execute format('alter table public.%I drop constraint %I', p_table, v_name);
  execute format('alter table public.%I add constraint %I foreign key (%I) references public.%I (id) on delete %s',
                 p_table, v_name, p_column, p_ref, p_rule);
end $$;

-- Records we keep, minus the person (admins or authors).
select pg_temp.repoint_fk('garages',             'approved_by', 'user_profiles', 'set null');
select pg_temp.repoint_fk('credit_transactions', 'created_by',  'user_profiles', 'set null');
select pg_temp.repoint_fk('system_settings',     'updated_by',  'user_profiles', 'set null');
select pg_temp.repoint_fk('audit_logs',          'actor_id',    'user_profiles', 'set null');
select pg_temp.repoint_fk('disputes',            'resolved_by', 'user_profiles', 'set null');
select pg_temp.repoint_fk('reports',             'handled_by',  'user_profiles', 'set null');
select pg_temp.repoint_fk('vehicle_history',     'created_by',  'user_profiles', 'set null');

alter table disputes alter column opened_by drop not null;
select pg_temp.repoint_fk('disputes', 'opened_by',   'user_profiles', 'set null');
alter table reports alter column reporter_id drop not null;
select pg_temp.repoint_fk('reports',  'reporter_id', 'user_profiles', 'set null');

-- Transfer offers are only meaningful between two live accounts.
select pg_temp.repoint_fk('vehicle_transfers', 'from_user_id', 'user_profiles', 'cascade');
select pg_temp.repoint_fk('vehicle_transfers', 'to_user_id',   'user_profiles', 'cascade');
select pg_temp.repoint_fk('garage_transfers',  'from_user_id', 'user_profiles', 'cascade');
select pg_temp.repoint_fk('garage_transfers',  'to_user_id',   'user_profiles', 'cascade');
select pg_temp.repoint_fk('fleets',            'owner_id',     'user_profiles', 'cascade');

-- Phase-2 tables pointing at requests/vehicles without a delete rule.
select pg_temp.repoint_fk('appointments',       'request_id', 'service_requests', 'set null');
select pg_temp.repoint_fk('appointments',       'vehicle_id', 'vehicles',         'set null');
select pg_temp.repoint_fk('service_records',    'request_id', 'service_requests', 'set null');
select pg_temp.repoint_fk('breakdown_requests', 'vehicle_id', 'vehicles',         'set null');

-- ---------------------------------------------------------------------------
-- 2. Why the caller can't delete their account yet (empty = good to go).
-- ---------------------------------------------------------------------------
create or replace function account_deletion_blockers()
returns setof text
language sql
stable
security definer
set search_path = public
as $$
  select 'admin'::text
   where exists (select 1 from user_profiles where id = auth.uid() and role = 'admin')
  union all
  select 'owns_garage'
   where exists (select 1 from garages where owner_id = auth.uid())
  union all
  select 'active_billing'
   where exists (select 1 from fleet_subscriptions
                  where user_id = auth.uid()
                    and stripe_subscription_id is not null
                    and status in ('trialing', 'active', 'past_due', 'unpaid'))
  union all
  select 'active_job'
   where exists (select 1 from service_requests
                  where customer_id = auth.uid()
                    and status in ('accepted', 'in_progress'))
  union all
  select 'open_dispute'
   where exists (select 1 from disputes d
                  where d.status in ('open', 'investigating')
                    and (d.opened_by = auth.uid()
                         or d.request_id in (select id from service_requests where customer_id = auth.uid())));
$$;

revoke all on function account_deletion_blockers() from public, anon;
grant execute on function account_deletion_blockers() to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Delete the caller's own marketplace data ahead of the auth user.
--    Requests go before vehicles (service_requests.vehicle_id is RESTRICT).
-- ---------------------------------------------------------------------------
create or replace function delete_my_account_data()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'UNAUTHENTICATED' using errcode = '28000';
  end if;
  if exists (select 1 from account_deletion_blockers()) then
    raise exception 'ACCOUNT_DELETION_BLOCKED' using errcode = 'P0001';
  end if;

  delete from service_requests where customer_id = v_uid;
  delete from vehicles where owner_id = v_uid;

  insert into audit_logs (actor_id, action, entity_type, entity_id)
  values (null, 'account.deleted', 'user', v_uid);
end $$;

revoke all on function delete_my_account_data() from public, anon;
grant execute on function delete_my_account_data() to authenticated;

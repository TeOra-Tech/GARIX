-- ============================================================
-- GARIX — Garage owner portal: ownership transfer + customer CRM.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Garage ownership transfer.
--    Everything keyed by garage_id travels with the garage:
--    wallet/credits, reviews, quotes, photos, certifications,
--    conversations. Mirrors the vehicle transfer design: reads
--    for the two parties, writes only via security definer RPCs.
-- ------------------------------------------------------------
create table garage_transfers (
  id uuid primary key default uuid_generate_v4(),
  garage_id uuid not null references garages (id) on delete cascade,
  from_user_id uuid not null references user_profiles (id),
  to_user_id uuid not null references user_profiles (id),
  garage_label text not null,   -- snapshot: recipient can't rely on reading the garage row
  status text not null default 'pending'
    check (status in ('pending','accepted','declined','cancelled')),
  created_at timestamptz not null default now(),
  responded_at timestamptz
);
create unique index uniq_garage_transfer_pending on garage_transfers (garage_id) where status = 'pending';
create index idx_garage_transfers_to on garage_transfers (to_user_id, status);

alter table garage_transfers enable row level security;
create policy "garage transfer parties read" on garage_transfers for select
  using (from_user_id = auth.uid() or to_user_id = auth.uid() or is_admin());
-- no insert/update/delete policies: writes happen via the RPCs below

create or replace function initiate_garage_transfer(p_garage_id uuid, p_to_email text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_caller uuid := auth.uid();
  v_garage garages%rowtype;
  v_to uuid;
  v_transfer_id uuid;
  v_from_name text;
begin
  if v_caller is null then
    raise exception 'Not signed in';
  end if;
  select * into v_garage from garages where id = p_garage_id;
  if not found or v_garage.owner_id <> v_caller then
    raise exception 'You can only transfer a garage you own';
  end if;
  select id into v_to from user_profiles
   where lower(email) = lower(trim(p_to_email));
  if not found then
    raise exception 'No Garix account found for that email';
  end if;
  if v_to = v_caller then
    raise exception 'That garage already belongs to this account';
  end if;

  insert into garage_transfers (garage_id, from_user_id, to_user_id, garage_label)
  values (p_garage_id, v_caller, v_to, v_garage.name)
  returning id into v_transfer_id;

  select full_name into v_from_name from user_profiles where id = v_caller;
  insert into notifications (user_id, type, title, body, data)
  values (v_to, 'system',
          'Garage ownership offer',
          coalesce(v_from_name, 'A Garix user') || ' wants to transfer ownership of ' ||
          v_garage.name || ' to you — including its credit wallet, reviews and history. ' ||
          'Accept or decline from your dashboard.',
          jsonb_build_object('kind', 'garage_transfer', 'transfer_id', v_transfer_id, 'link', '/dashboard'));

  return v_transfer_id;
end $$;

create or replace function respond_garage_transfer(p_transfer_id uuid, p_accept boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_caller uuid := auth.uid();
  v_t garage_transfers%rowtype;
begin
  if v_caller is null then
    raise exception 'Not signed in';
  end if;
  select * into v_t from garage_transfers where id = p_transfer_id for update;
  if not found or v_t.to_user_id <> v_caller then
    raise exception 'Transfer not found';
  end if;
  if v_t.status <> 'pending' then
    raise exception 'This transfer has already been resolved';
  end if;

  if p_accept then
    update garages set owner_id = v_caller where id = v_t.garage_id;
    -- the new owner needs the garage portal
    update user_profiles set role = 'garage_owner'
     where id = v_caller and role = 'customer';
    -- the old owner drops back to customer once they own no garages
    update user_profiles set role = 'customer'
     where id = v_t.from_user_id and role = 'garage_owner'
       and not exists (select 1 from garages g where g.owner_id = v_t.from_user_id);
    update garage_transfers
       set status = 'accepted', responded_at = now()
     where id = p_transfer_id;
    insert into notifications (user_id, type, title, body, data)
    values (v_t.from_user_id, 'system', 'Garage transfer accepted',
            'Ownership of ' || v_t.garage_label || ' has moved to its new owner.',
            jsonb_build_object('kind', 'garage_transfer', 'transfer_id', p_transfer_id));
  else
    update garage_transfers
       set status = 'declined', responded_at = now()
     where id = p_transfer_id;
    insert into notifications (user_id, type, title, body, data)
    values (v_t.from_user_id, 'system', 'Garage transfer declined',
            'The transfer of ' || v_t.garage_label || ' was declined.',
            jsonb_build_object('kind', 'garage_transfer', 'transfer_id', p_transfer_id));
  end if;
end $$;

create or replace function cancel_garage_transfer(p_transfer_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_caller uuid := auth.uid();
begin
  update garage_transfers
     set status = 'cancelled', responded_at = now()
   where id = p_transfer_id and from_user_id = v_caller and status = 'pending';
  if not found then
    raise exception 'Transfer not found';
  end if;
end $$;

revoke execute on function initiate_garage_transfer(uuid, text) from public, anon;
revoke execute on function respond_garage_transfer(uuid, boolean) from public, anon;
revoke execute on function cancel_garage_transfer(uuid) from public, anon;
grant execute on function initiate_garage_transfer(uuid, text) to authenticated;
grant execute on function respond_garage_transfer(uuid, boolean) to authenticated;
grant execute on function cancel_garage_transfer(uuid) to authenticated;

-- ------------------------------------------------------------
-- 2. Customer CRM for a garage.
--    Only customers with a real business relationship (they accepted
--    a quote from this garage) — quoting alone must not expose
--    anyone's contact details. Caller must own the garage.
-- ------------------------------------------------------------
create or replace function get_garage_customers(p_garage_id uuid)
returns table (
  customer_id uuid,
  full_name text,
  email text,
  mobile_number text,
  jobs_total bigint,
  jobs_completed bigint,
  last_job_at timestamptz,
  total_value numeric
) language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  if not exists (select 1 from garages g where g.id = p_garage_id and g.owner_id = auth.uid())
     and not is_admin() then
    raise exception 'You can only view customers of a garage you own';
  end if;

  return query
  select up.id,
         up.full_name,
         up.email,
         up.mobile_number,
         count(*)::bigint,
         count(*) filter (where sr.status = 'completed')::bigint,
         max(coalesce(sr.completed_at, q.updated_at)),
         sum(q.grand_total)::numeric
    from quotes q
    join service_requests sr on sr.id = q.request_id
    join user_profiles up on up.id = sr.customer_id
   where q.garage_id = p_garage_id
     and q.status = 'accepted'
   group by up.id, up.full_name, up.email, up.mobile_number
   order by max(coalesce(sr.completed_at, q.updated_at)) desc;
end $$;

revoke execute on function get_garage_customers(uuid) from public, anon;
grant execute on function get_garage_customers(uuid) to authenticated;

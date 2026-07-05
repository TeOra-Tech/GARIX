-- ============================================================
-- GARIX — Functions & Triggers
-- ============================================================

-- ---------- updated_at maintenance ----------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'user_profiles','garages','vehicles','service_requests','quotes','payments'
  ] loop
    execute format(
      'create trigger trg_%s_updated before update on %s
       for each row execute function set_updated_at()', t, t);
  end loop;
end $$;

-- ---------- Auto-create profile + wallet plumbing ----------
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into user_profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.email, ''),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'customer')
  );
  insert into notification_preferences (user_id) values (new.id);
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

create or replace function handle_new_garage()
returns trigger language plpgsql as $$
begin
  insert into credit_wallets (garage_id) values (new.id);
  return new;
end $$;

create trigger on_garage_created
  after insert on garages
  for each row execute function handle_new_garage();

-- ---------- Review aggregation onto garage ----------
create or replace function refresh_garage_rating()
returns trigger language plpgsql as $$
declare g uuid;
begin
  g := coalesce(new.garage_id, old.garage_id);
  update garages set
    avg_rating = coalesce((
      select round(avg(rating_overall)::numeric, 2)
      from reviews where garage_id = g and not is_hidden), 0),
    review_count = (
      select count(*) from reviews where garage_id = g and not is_hidden)
  where id = g;
  return coalesce(new, old);
end $$;

create trigger trg_reviews_aggregate
  after insert or update or delete on reviews
  for each row execute function refresh_garage_rating();

-- ---------- Atomic credit spend (quote submission etc.) ----------
-- Called from Edge Functions with service role. Concurrency-safe.
create or replace function spend_credits(
  p_garage_id uuid,
  p_amount int,
  p_type credit_tx_type,
  p_reference uuid default null,
  p_description text default null
) returns int language plpgsql security definer set search_path = public as $$
declare new_balance int;
begin
  update credit_wallets
     set balance = balance - p_amount, updated_at = now()
   where garage_id = p_garage_id and balance >= p_amount
   returning balance into new_balance;

  if new_balance is null then
    raise exception 'INSUFFICIENT_CREDITS';
  end if;

  insert into credit_transactions (garage_id, type, amount, balance_after, reference_id, description)
  values (p_garage_id, p_type, -p_amount, new_balance, p_reference, p_description);

  return new_balance;
end $$;

create or replace function add_credits(
  p_garage_id uuid,
  p_amount int,
  p_type credit_tx_type,
  p_reference uuid default null,
  p_description text default null
) returns int language plpgsql security definer set search_path = public as $$
declare new_balance int;
begin
  update credit_wallets
     set balance = balance + p_amount, updated_at = now()
   where garage_id = p_garage_id
   returning balance into new_balance;

  insert into credit_transactions (garage_id, type, amount, balance_after, reference_id, description)
  values (p_garage_id, p_type, p_amount, new_balance, p_reference, p_description);

  return new_balance;
end $$;

-- ---------- Quote acceptance workflow ----------
create or replace function accept_quote(p_quote_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_request uuid;
begin
  select request_id into v_request from quotes where id = p_quote_id;

  update quotes set status = 'accepted' where id = p_quote_id;
  update quotes set status = 'rejected'
   where request_id = v_request and id <> p_quote_id and status = 'submitted';
  update service_requests
     set status = 'accepted', accepted_quote_id = p_quote_id
   where id = v_request;
end $$;

-- ---------- Job completion: increment counter + capture AI training row ----------
create or replace function complete_job(p_request_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare q record; v record;
begin
  update service_requests
     set status = 'completed', completed_at = now()
   where id = p_request_id;

  select q2.*, sr.vehicle_id into q
    from quotes q2 join service_requests sr on sr.id = q2.request_id
   where q2.id = (select accepted_quote_id from service_requests where id = p_request_id);

  if q.id is not null then
    update garages set completed_jobs_count = completed_jobs_count + 1 where id = q.garage_id;

    select * into v from vehicles where id = q.vehicle_id;
    insert into repair_training_data
      (request_id, quote_id, vehicle_snapshot, labour_hours, labour_cost, parts_cost, quote_outcome, repair_outcome, region)
    values (
      p_request_id, q.id,
      jsonb_build_object('make', v.make_text, 'model', v.model_text, 'year', v.year,
                         'fuel', v.fuel_type, 'mileage_km', v.mileage_km),
      q.estimated_duration_hours, q.labour_cost, q.parts_cost, 'accepted', 'completed',
      (select location_county from service_requests where id = p_request_id)
    );
  end if;
end $$;

-- ---------- Geo search: garages near a point, matching filters ----------
create or replace function search_garages(
  p_lat double precision,
  p_lng double precision,
  p_radius_km int default 50,
  p_category uuid default null,
  p_min_rating numeric default null,
  p_ev_only boolean default false,
  p_collection boolean default false
) returns table (
  garage_id uuid, name text, slug text, avg_rating numeric, review_count int,
  distance_km numeric, town text, county text, logo_url text
) language sql stable as $$
  select g.id, g.name, g.slug, g.avg_rating, g.review_count,
         round((st_distance(gl.location, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography) / 1000)::numeric, 1),
         gl.town, gl.county, g.logo_url
    from garages g
    join garage_locations gl on gl.garage_id = g.id and gl.is_primary
   where g.status = 'active'
     and st_dwithin(gl.location, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography, p_radius_km * 1000)
     and (p_category is null or exists (
           select 1 from garage_services gs
            where gs.garage_id = g.id and gs.repair_category_id = p_category))
     and (p_min_rating is null or g.avg_rating >= p_min_rating)
     and (not p_ev_only or g.is_ev_specialist)
     and (not p_collection or g.offers_collection)
   order by st_distance(gl.location, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography);
$$;

create or replace function g_radius(p_garage_id uuid)
returns int language sql stable as $$
  select service_radius_km from garages where id = p_garage_id;
$$;

-- ---------- Garage matching for new requests (notification fan-out) ----------
create or replace function garages_matching_request(p_request_id uuid)
returns table (garage_id uuid, owner_id uuid) language sql stable as $$
  select g.id, g.owner_id
    from service_requests sr
    join garage_locations gl on st_dwithin(gl.location, sr.location, g_radius(gl.garage_id) * 1000)
    join garages g on g.id = gl.garage_id and g.status = 'active'
   where sr.id = p_request_id
     and (sr.service_category_id is null or exists (
           select 1 from garage_services gs
            where gs.garage_id = g.id
              and gs.repair_category_id in (sr.service_category_id, sr.problem_category_id)));
$$;


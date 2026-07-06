-- Supabase grants EXECUTE on public-schema functions to anon + authenticated
-- by default, and no migration ever revoked it. That left every money/state
-- RPC callable by any client: add_credits (mint free credits), spend_credits
-- (drain a competitor's wallet), accept_quote / complete_job (act on other
-- people's records). Lock them down:
--   * wallet mutations become service-role only (Edge Functions / admin)
--   * accept_quote / complete_job stay client-callable but verify the caller
--     is the request's customer (or admin) and the state transition is legal.

-- ---------- wallet mutations: service role only ----------
revoke execute on function spend_credits(uuid, int, credit_tx_type, uuid, text) from public, anon, authenticated;
revoke execute on function add_credits(uuid, int, credit_tx_type, uuid, text) from public, anon, authenticated;

-- ---------- accept_quote: request's customer only, legal states only ----------
create or replace function accept_quote(p_quote_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_request uuid;
  v_customer uuid;
  v_req_status request_status;
  v_quote_status quote_status;
  v_valid_until timestamptz;
begin
  select q.request_id, sr.customer_id, sr.status, q.status, q.valid_until
    into v_request, v_customer, v_req_status, v_quote_status, v_valid_until
    from quotes q
    join service_requests sr on sr.id = q.request_id
   where q.id = p_quote_id;

  if v_request is null then
    raise exception 'QUOTE_NOT_FOUND';
  end if;
  if v_customer is distinct from auth.uid() and not is_admin() then
    raise exception 'FORBIDDEN';
  end if;
  if v_req_status not in ('open', 'quoted') then
    raise exception 'REQUEST_NOT_OPEN';
  end if;
  if v_quote_status <> 'submitted' then
    raise exception 'QUOTE_NOT_SUBMITTED';
  end if;
  if v_valid_until < now() then
    raise exception 'QUOTE_EXPIRED';
  end if;

  update quotes set status = 'accepted' where id = p_quote_id;
  update quotes set status = 'rejected'
   where request_id = v_request and id <> p_quote_id and status = 'submitted';
  update service_requests
     set status = 'accepted', accepted_quote_id = p_quote_id
   where id = v_request;
end $$;

revoke execute on function accept_quote(uuid) from public, anon;

-- ---------- complete_job: request's customer only, from 'accepted' only ----------
create or replace function complete_job(p_request_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_customer uuid;
  v_status request_status;
  q record;
  v record;
begin
  select customer_id, status into v_customer, v_status
    from service_requests where id = p_request_id;

  if v_customer is null then
    raise exception 'REQUEST_NOT_FOUND';
  end if;
  if v_customer is distinct from auth.uid() and not is_admin() then
    raise exception 'FORBIDDEN';
  end if;
  if v_status <> 'accepted' then
    raise exception 'REQUEST_NOT_ACCEPTED';
  end if;

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

revoke execute on function complete_job(uuid) from public, anon;

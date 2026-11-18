-- 00029_request_edit_delete
-- Customers can edit or delete a posted repair request.
--
--   * Edit: only before the first quote arrives (status draft/open). Once a
--     garage has priced the job, changing the description under them is unfair.
--   * Delete: any time before a quote is accepted. With no quotes the request
--     is removed outright; with quotes it is cancelled instead, so garages keep
--     the record of the quote they paid credits for, and they are notified.
--
-- Direct UPDATE/DELETE on service_requests was previously open to the owner
-- for every column (including status). Writes now go through these RPCs; the
-- client keeps SELECT and INSERT, admins keep full access.

drop policy "customer own requests" on service_requests;

create policy "customer read own requests" on service_requests for select
  using (customer_id = auth.uid() or is_admin());
create policy "customer create own requests" on service_requests for insert
  with check (customer_id = auth.uid() or is_admin());
create policy "admin manage requests" on service_requests for all
  using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------------------
create or replace function update_my_request(
  p_request_id uuid,
  p_vehicle_id uuid,
  p_service_category_id uuid,
  p_problem_category_id uuid,
  p_title text,
  p_description text,
  p_urgency urgency_level,
  p_location_town text,
  p_location_county text,
  p_lat double precision,
  p_lng double precision,
  p_collection_required boolean,
  p_expected_completion_date date,
  p_budget_amount numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status request_status;
begin
  select status into v_status
    from service_requests
   where id = p_request_id and customer_id = auth.uid()
   for update;
  if not found then
    raise exception 'REQUEST_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_status not in ('draft', 'open') then
    raise exception 'REQUEST_NOT_EDITABLE' using errcode = 'P0001';
  end if;
  if not exists (select 1 from vehicles where id = p_vehicle_id and owner_id = auth.uid()) then
    raise exception 'VEHICLE_NOT_OWNED' using errcode = 'P0001';
  end if;
  if length(trim(coalesce(p_title, ''))) < 3 or length(trim(coalesce(p_description, ''))) < 10 then
    raise exception 'INVALID_INPUT' using errcode = '22023';
  end if;

  update service_requests set
    vehicle_id = p_vehicle_id,
    service_category_id = p_service_category_id,
    problem_category_id = p_problem_category_id,
    title = trim(p_title),
    description = trim(p_description),
    urgency = p_urgency,
    location_town = nullif(trim(p_location_town), ''),
    location_county = nullif(trim(p_location_county), ''),
    -- A new point only when the customer picked a place; otherwise keep it.
    location = case
      when p_lat is not null and p_lng is not null
        then st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography
      else location
    end,
    collection_required = coalesce(p_collection_required, false),
    expected_completion_date = p_expected_completion_date,
    budget_amount = p_budget_amount
  where id = p_request_id;
end $$;

revoke all on function update_my_request(uuid, uuid, uuid, uuid, text, text, urgency_level, text, text,
  double precision, double precision, boolean, date, numeric) from public, anon;
grant execute on function update_my_request(uuid, uuid, uuid, uuid, text, text, urgency_level, text, text,
  double precision, double precision, boolean, date, numeric) to authenticated;

-- ---------------------------------------------------------------------------
-- Returns 'deleted' (no quotes: row and attachments removed) or 'cancelled'
-- (quotes exist: request closed, live quotes expired, garages notified).
create or replace function delete_my_request(p_request_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status request_status;
  v_title text;
  r record;
begin
  select status, title into v_status, v_title
    from service_requests
   where id = p_request_id and customer_id = auth.uid()
   for update;
  if not found then
    raise exception 'REQUEST_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_status in ('accepted', 'in_progress', 'completed') then
    raise exception 'REQUEST_NOT_DELETABLE' using errcode = 'P0001';
  end if;

  if not exists (select 1 from quotes where request_id = p_request_id) then
    delete from service_requests where id = p_request_id;
    return 'deleted';
  end if;

  update service_requests set status = 'cancelled' where id = p_request_id;

  for r in
    select q.id as quote_id, g.id as garage_id, g.owner_id
      from quotes q join garages g on g.id = q.garage_id
     where q.request_id = p_request_id and q.status = 'submitted'
  loop
    update quotes set status = 'expired' where id = r.quote_id;
    insert into notifications (user_id, type, title, body, data)
    values (
      r.owner_id, 'system',
      'Request cancelled: ' || v_title,
      'The customer cancelled this request, so your quote is no longer open.',
      jsonb_build_object('kind', 'request_cancelled', 'request_id', p_request_id,
                         'link', '/dashboard/garages/' || r.garage_id || '/quotes')
    );
  end loop;

  return 'cancelled';
end $$;

revoke all on function delete_my_request(uuid) from public, anon;
grant execute on function delete_my_request(uuid) to authenticated;

-- Quote comparison: give customers richer, comparable signals per quote so the UI
-- can categorise offers as Cheapest / Fastest / Best value.
--
-- Two things are added:
--   1. quotes.earliest_start_date — when the garage can actually do the job. This is
--      the "availability" axis the "Fastest" category ranks on (distinct from
--      estimated_duration_hours, which is how long the work itself takes).
--   2. quote_comparison_stats(request) — a SECURITY DEFINER RPC returning, per garage
--      that quoted on the request, the distance to the customer and the number of
--      *similar* jobs (same service category) that garage has completed through Garix.
--      Both are otherwise unreachable from the client: RLS scopes garage_locations to
--      the public but a customer cannot read other customers' completed requests to
--      count them, so the count is computed server-side and gated to the request owner.

alter table quotes add column if not exists earliest_start_date date;

comment on column quotes.earliest_start_date is
  'Earliest date the garage can start/carry out the job (garage-stated availability).';

create or replace function quote_comparison_stats(p_request_id uuid)
returns table (
  garage_id uuid,
  distance_km numeric,
  similar_jobs_count int
)
language sql stable security definer set search_path = public as $$
  with req as (
    select sr.id, sr.location, sr.service_category_id
      from service_requests sr
     where sr.id = p_request_id
       and sr.customer_id = auth.uid()   -- caller must own the request; else no rows
  )
  select
    q.garage_id,
    case
      when req.location is not null and gl.location is not null
      then round((st_distance(gl.location, req.location) / 1000)::numeric, 1)
      else null
    end as distance_km,
    (
      select count(*)::int
        from service_requests sr2
        join quotes q2 on q2.id = sr2.accepted_quote_id
       where q2.garage_id = q.garage_id
         and sr2.status = 'completed'
         and (req.service_category_id is null
              or sr2.service_category_id = req.service_category_id)
    ) as similar_jobs_count
  from req
  join quotes q on q.request_id = req.id
  left join garage_locations gl on gl.garage_id = q.garage_id and gl.is_primary
  group by q.garage_id, gl.location, req.location, req.service_category_id;
$$;

grant execute on function quote_comparison_stats(uuid) to authenticated;

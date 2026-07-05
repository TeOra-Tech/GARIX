-- ============================================================
-- GARIX — Fix RLS policy recursion (pre-existing in 00004)
-- service_requests "garage read own jobs" subqueried quotes while
-- quotes "customer read quotes on own requests" subqueried
-- service_requests. Policy subqueries run as the invoker, so each
-- side re-triggered the other's RLS and every select on either
-- table (or on tables whose policies join through them: vehicles,
-- request_attachments, quote_items, vat_calculations,
-- insurance_claims, repair_predictions, ...) failed with
-- "infinite recursion detected in policy".
-- Replace the cross-references with security definer helpers,
-- same pattern as owns_garage()/is_admin().
-- ============================================================

create or replace function is_own_request(req uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from service_requests sr
                  where sr.id = req and sr.customer_id = auth.uid());
$$;

create or replace function won_request(req uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from quotes q
      join garages g on g.id = q.garage_id
     where q.request_id = req and q.status = 'accepted' and g.owner_id = auth.uid());
$$;

drop policy "garage read own jobs" on service_requests;
create policy "garage read own jobs" on service_requests for select
  using (won_request(id));

drop policy "customer read quotes on own requests" on quotes;
create policy "customer read quotes on own requests" on quotes for select
  using (is_own_request(request_id));

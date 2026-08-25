-- ============================================================
-- GARIX — Garage revenue model: Basic (free) vs Pro (€49/mo).
--   Basic: 2 credits/quote, capped at N quotes/day, basic reviews.
--   Pro:   unlimited free quotes + CRM, analytics, booking, reminders,
--          vehicle history, review replies.
-- All new behaviour is gated behind system_settings 'plans.enabled'
-- (default false) so this migration does NOT change the currently
-- deployed site until we flip the flag at deploy time.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Plan tier cache on the garage (authoritative source is the
--    subscription status; this column is a convenience for UI/search).
-- ------------------------------------------------------------
alter table garages
  add column plan text not null default 'basic'
  check (plan in ('basic', 'pro'));

-- ------------------------------------------------------------
-- 2. Pro subscription billing state (per garage). Service-role
--    writes only; the garage owner may read their own.
-- ------------------------------------------------------------
create table garage_subscriptions (
  garage_id uuid primary key references garages (id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text unique,
  stripe_item_id text,
  status text not null default 'incomplete'
    check (status in ('incomplete','incomplete_expired','trialing','active',
                      'past_due','canceled','unpaid','paused')),
  price_cents int not null default 4900,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table garage_subscriptions enable row level security;
create policy "own garage subscription read" on garage_subscriptions for select
  using (owns_garage(garage_id) or is_admin());
-- no client write policies: only the service role writes.

create trigger trg_garage_subscriptions_updated
  before update on garage_subscriptions
  for each row execute function set_updated_at();

-- Pro = an active/trialing subscription.
create or replace function garage_is_pro(p_garage_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from garage_subscriptions
     where garage_id = p_garage_id and status in ('active', 'trialing')
  );
$$;

-- ------------------------------------------------------------
-- 3. Settings: activation flag, Basic daily limit, Pro price.
-- ------------------------------------------------------------
insert into system_settings (key, value, description) values
  ('plans.enabled',
   jsonb_build_object('enabled', false),
   'Master switch for the Basic/Pro garage plan model. Flip to true at deploy time.'),
  ('plans.basic_daily_quote_limit',
   jsonb_build_object('limit', 3),
   'Max quotes per day for Basic (free) garages'),
  ('plans.pro_price',
   jsonb_build_object('cents', 4900, 'currency', 'eur', 'interval', 'month'),
   'Garage Pro plan monthly price'),
  ('plans.pro_stripe_price_id',
   jsonb_build_object('id', 'set-operationally'),
   'Stripe Price id for the garage Pro subscription')
on conflict (key) do nothing;

-- ------------------------------------------------------------
-- 4. Plan-aware quote charging. Called by the submit-quote Edge
--    Function INSTEAD of spend_credits. When plans are disabled it
--    behaves exactly like the old flow (charge credits, no cap), so
--    deploying the new function before flipping the flag is a no-op.
--      Pro  → free, unlimited (returns 0)
--      Basic→ enforce daily cap, then charge 2/5 credits
-- ------------------------------------------------------------
create or replace function charge_for_quote(
  p_garage_id uuid, p_is_priority boolean, p_request_id uuid
) returns int language plpgsql security definer set search_path = public as $$
declare
  v_enabled boolean := coalesce((select (value->>'enabled')::boolean from system_settings where key = 'plans.enabled'), false);
  v_limit int := coalesce((select (value->>'limit')::int from system_settings where key = 'plans.basic_daily_quote_limit'), 3);
  v_cost int;
  v_today int;
begin
  if v_enabled and garage_is_pro(p_garage_id) then
    return 0;  -- Pro: unlimited, no credit charge
  end if;

  if v_enabled then
    -- Basic: daily quote cap (Europe/Dublin calendar day)
    select count(*) into v_today from quotes
     where garage_id = p_garage_id
       and (created_at at time zone 'Europe/Dublin')::date
           = (now() at time zone 'Europe/Dublin')::date;
    if v_today >= v_limit then
      raise exception 'QUOTE_DAILY_LIMIT'
        using hint = 'Basic garages can send a limited number of quotes per day. Upgrade to Pro for unlimited quotes.';
    end if;
  end if;

  v_cost := coalesce((
    select (value->>'cost')::int from system_settings
     where key = case when p_is_priority then 'credits.priority_quote' else 'credits.submit_quote' end
  ), case when p_is_priority then 5 else 2 end);

  perform spend_credits(
    p_garage_id => p_garage_id,
    p_amount    => v_cost,
    p_type      => (case when p_is_priority then 'priority_quote_fee' else 'quote_fee' end)::credit_tx_type,
    p_reference => p_request_id,
    p_description => 'Quote on request ' || p_request_id
  );
  return v_cost;
end $$;

revoke execute on function charge_for_quote(uuid, boolean, uuid) from public, anon, authenticated;

-- ------------------------------------------------------------
-- 5. Customer CRM becomes Pro-only (once plans are enabled).
--    Re-create get_garage_customers from 00020 with the plan gate.
-- ------------------------------------------------------------
create or replace function get_garage_customers(p_garage_id uuid)
returns table (
  customer_id uuid, full_name text, email text, mobile_number text,
  jobs_total bigint, jobs_completed bigint, last_job_at timestamptz, total_value numeric
) language plpgsql security definer set search_path = public as $$
declare
  v_enabled boolean := coalesce((select (value->>'enabled')::boolean from system_settings where key = 'plans.enabled'), false);
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  if not exists (select 1 from garages g where g.id = p_garage_id and g.owner_id = auth.uid())
     and not is_admin() then
    raise exception 'You can only view customers of a garage you own';
  end if;
  if v_enabled and not garage_is_pro(p_garage_id) and not is_admin() then
    raise exception 'PRO_REQUIRED'
      using hint = 'The customer CRM is a Pro feature. Upgrade this garage to Pro.';
  end if;

  return query
  select up.id, up.full_name, up.email, up.mobile_number,
         count(*)::bigint,
         count(*) filter (where sr.status = 'completed')::bigint,
         max(coalesce(sr.completed_at, q.updated_at)),
         sum(q.grand_total)::numeric
    from quotes q
    join service_requests sr on sr.id = q.request_id
    join user_profiles up on up.id = sr.customer_id
   where q.garage_id = p_garage_id and q.status = 'accepted'
   group by up.id, up.full_name, up.email, up.mobile_number
   order by max(coalesce(sr.completed_at, q.updated_at)) desc;
end $$;

-- ------------------------------------------------------------
-- 6. How many quotes has a garage sent today? (Basic remaining count)
-- ------------------------------------------------------------
create or replace function garage_quotes_today(p_garage_id uuid)
returns int language sql stable security definer set search_path = public as $$
  select count(*)::int from quotes
   where garage_id = p_garage_id
     and (created_at at time zone 'Europe/Dublin')::date
         = (now() at time zone 'Europe/Dublin')::date;
$$;
grant execute on function garage_quotes_today(uuid) to authenticated;

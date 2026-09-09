-- ============================================================
-- GARIX — Admin-granted comps: free Pro trials for garages and free
-- trials for fleet accounts, granted from the admin console with no
-- Stripe billing attached.
--
-- The grants themselves are written by the service role in /api/admin
-- (consistent with garage_status / adjust_credits). An admin-granted
-- trial is a subscription row with status='trialing' and NO
-- stripe_subscription_id — that is how it is told apart from a real
-- Stripe trial (which Stripe's webhooks manage). garage_is_pro() and
-- fleet_can_add() already treat 'trialing' as entitled, so nothing else
-- needs to change to make the trial take effect.
--
-- This migration adds the one thing the route cannot do: automatic
-- expiry. Stripe-less trials have no webhook to end them, so a daily
-- job cancels them once current_period_end passes and downgrades the
-- garage plan cache back to 'basic'.
-- ============================================================

create or replace function expire_admin_trials()
returns int language plpgsql security definer set search_path = public as $$
declare
  v_count int := 0;
  r record;
begin
  -- Garage Pro trials granted without Stripe, past their end date.
  for r in
    update garage_subscriptions
       set status = 'canceled'
     where status = 'trialing'
       and stripe_subscription_id is null
       and current_period_end is not null
       and current_period_end < now()
    returning garage_id
  loop
    update garages set plan = 'basic' where id = r.garage_id and plan = 'pro';
    insert into notifications (user_id, type, title, body, data)
    select g.owner_id, 'system', 'Your Pro trial has ended',
           'Your Garix Pro trial has ended and your garage is back on the Basic plan. Upgrade any time to keep Pro features.',
           jsonb_build_object('garage_id', g.id)
      from garages g where g.id = r.garage_id;
    v_count := v_count + 1;
  end loop;

  -- Fleet trials granted without Stripe, past their end date.
  for r in
    update fleet_subscriptions
       set status = 'canceled'
     where status = 'trialing'
       and stripe_subscription_id is null
       and current_period_end is not null
       and current_period_end < now()
    returning user_id
  loop
    insert into notifications (user_id, type, title, body, data)
    values (r.user_id, 'system', 'Your fleet trial has ended',
            'Your Garix fleet trial has ended. Add fleet billing to keep adding vehicles to your fleet.',
            '{}'::jsonb);
    v_count := v_count + 1;
  end loop;

  return v_count;
end $$;

-- Server-side only: the cron job and service role run it, clients never do.
revoke execute on function expire_admin_trials() from public, anon, authenticated;

-- Schedule daily at 03:00 UTC. Guarded like the other cron jobs so the
-- migration still applies where pg_cron is unavailable.
do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule('expire-admin-trials-daily', '0 3 * * *',
                        'select public.expire_admin_trials()');
exception when others then
  raise notice 'pg_cron unavailable, trial-expiry job not scheduled: %', sqlerrm;
end $$;

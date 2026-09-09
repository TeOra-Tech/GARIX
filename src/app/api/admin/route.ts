import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { Database } from '@/types/database';

const actionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('garage_status'),
    garageId: z.string().uuid(),
    status: z.enum(['active', 'rejected', 'suspended']),
  }),
  z.object({
    action: z.literal('adjust_credits'),
    garageId: z.string().uuid(),
    amount: z.number().int().refine((n) => n !== 0, 'Amount cannot be zero').refine((n) => Math.abs(n) <= 10000, 'At most 10,000 credits per adjustment'),
    reason: z.string().trim().min(3).max(200),
  }),
  z.object({
    action: z.literal('grant_garage_trial'),
    garageId: z.string().uuid(),
    days: z.number().int().min(1, 'At least 1 day').max(365, 'At most 365 days'),
  }),
  z.object({
    action: z.literal('grant_fleet_trial'),
    userId: z.string().uuid(),
    days: z.number().int().min(1, 'At least 1 day').max(365, 'At most 365 days'),
  }),
]);

const STATUS_NOTIFICATIONS = {
  active: {
    type: 'garage_approved',
    title: 'Your garage is live',
    body: 'Verification complete — matching repair requests now appear in your feed.',
  },
  rejected: {
    type: 'garage_rejected',
    title: 'Garage registration rejected',
    body: 'Your registration could not be approved. Contact support for details.',
  },
  suspended: {
    type: 'system',
    title: 'Garage suspended',
    body: 'Your garage has been suspended. Contact support.',
  },
} as const;

/**
 * Admin operations that need the service role: status transitions with
 * notifications (clients cannot insert notifications) and wallet adjustments
 * (add_credits is service-role only since 00010). Bearer-authenticated;
 * the caller must be an admin. Every action writes an audit_logs row.
 */
export async function POST(request: Request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer /i, '');
  if (!token) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });

  const service = createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const {
    data: { user },
  } = await service.auth.getUser(token);
  if (!user) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });

  const { data: profile } = await service
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });

  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'INVALID_BODY', detail: parsed.error.issues[0]?.message }, { status: 400 });
  }
  const body = parsed.data;

  if (body.action === 'garage_status') {
    const { data: garage } = await service
      .from('garages')
      .select('id, status, owner_id, name')
      .eq('id', body.garageId)
      .single();
    if (!garage) return NextResponse.json({ error: 'GARAGE_NOT_FOUND' }, { status: 404 });

    const { error } = await service
      .from('garages')
      .update({
        status: body.status,
        ...(body.status === 'active' ? { approved_at: new Date().toISOString(), approved_by: user.id } : {}),
      })
      .eq('id', body.garageId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const n = STATUS_NOTIFICATIONS[body.status];
    await service.from('notifications').insert({
      user_id: garage.owner_id,
      type: n.type,
      title: n.title,
      body: n.body,
      data: { garage_id: garage.id },
    });
    await service.from('audit_logs').insert({
      actor_id: user.id,
      action: `garage.${body.status}`,
      entity_type: 'garage',
      entity_id: garage.id,
      before_state: { status: garage.status },
      after_state: { status: body.status },
    });
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'grant_garage_trial') {
    const { data: garage } = await service
      .from('garages')
      .select('id, owner_id, name, plan')
      .eq('id', body.garageId)
      .single();
    if (!garage) return NextResponse.json({ error: 'GARAGE_NOT_FOUND' }, { status: 404 });

    // Never clobber a real Stripe subscription with a comp trial.
    const { data: existing } = await service
      .from('garage_subscriptions')
      .select('status, stripe_subscription_id')
      .eq('garage_id', body.garageId)
      .maybeSingle();
    if (existing?.stripe_subscription_id) {
      return NextResponse.json({ error: 'HAS_STRIPE_SUBSCRIPTION' }, { status: 409 });
    }

    const { data: priceSetting } = await service
      .from('system_settings').select('value').eq('key', 'plans.pro_price').maybeSingle();
    const priceCents = Number((priceSetting?.value as { cents?: number } | null)?.cents ?? 4900);
    const periodEnd = new Date(Date.now() + body.days * 86_400_000).toISOString();

    const { error: subErr } = await service.from('garage_subscriptions').upsert(
      {
        garage_id: body.garageId,
        status: 'trialing',
        price_cents: priceCents,
        current_period_end: periodEnd,
        cancel_at_period_end: true,
        stripe_customer_id: null,
        stripe_subscription_id: null,
        stripe_item_id: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'garage_id' },
    );
    if (subErr) return NextResponse.json({ error: subErr.message }, { status: 500 });

    await service.from('garages').update({ plan: 'pro' }).eq('id', body.garageId);
    await service.from('notifications').insert({
      user_id: garage.owner_id,
      type: 'system',
      title: 'Pro trial activated',
      body: `Your garage is now on Garix Pro free for ${body.days} day${body.days === 1 ? '' : 's'} — unlimited quotes and all Pro tools are unlocked.`,
      data: { garage_id: garage.id },
    });
    await service.from('audit_logs').insert({
      actor_id: user.id,
      action: 'garage.grant_pro_trial',
      entity_type: 'garage',
      entity_id: garage.id,
      before_state: { plan: garage.plan },
      after_state: { plan: 'pro', trial_days: body.days, trial_ends_at: periodEnd },
    });
    return NextResponse.json({ ok: true, trialEndsAt: periodEnd });
  }

  if (body.action === 'grant_fleet_trial') {
    const { data: profile2 } = await service
      .from('user_profiles')
      .select('id, full_name, role, account_type')
      .eq('id', body.userId)
      .single();
    if (!profile2) return NextResponse.json({ error: 'USER_NOT_FOUND' }, { status: 404 });
    if (profile2.role !== 'customer') {
      return NextResponse.json({ error: 'NOT_A_CUSTOMER' }, { status: 409 });
    }

    const { data: existing } = await service
      .from('fleet_subscriptions')
      .select('status, stripe_subscription_id')
      .eq('user_id', body.userId)
      .maybeSingle();
    if (existing?.stripe_subscription_id) {
      return NextResponse.json({ error: 'HAS_STRIPE_SUBSCRIPTION' }, { status: 409 });
    }

    const { data: priceSetting } = await service
      .from('system_settings').select('value').eq('key', 'fleet.price_per_vehicle').maybeSingle();
    const perVehicleCents = Number((priceSetting?.value as { cents?: number } | null)?.cents ?? 500);
    const { count: vehicleCount } = await service
      .from('vehicles').select('id', { count: 'exact', head: true }).eq('owner_id', body.userId);
    const periodEnd = new Date(Date.now() + body.days * 86_400_000).toISOString();

    // Promote to a fleet account (unlimited vehicles while in good standing).
    if (profile2.account_type !== 'fleet') {
      await service.from('user_profiles').update({ account_type: 'fleet' }).eq('id', body.userId);
    }
    const { error: subErr } = await service.from('fleet_subscriptions').upsert(
      {
        user_id: body.userId,
        status: 'trialing',
        price_per_vehicle_cents: perVehicleCents,
        quantity: vehicleCount ?? 0,
        current_period_end: periodEnd,
        cancel_at_period_end: true,
        stripe_customer_id: null,
        stripe_subscription_id: null,
        stripe_item_id: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );
    if (subErr) return NextResponse.json({ error: subErr.message }, { status: 500 });

    await service.from('notifications').insert({
      user_id: body.userId,
      type: 'system',
      title: 'Fleet trial activated',
      body: `Your account is now a Garix fleet account, free for ${body.days} day${body.days === 1 ? '' : 's'} — add unlimited vehicles with full service history and reminders.`,
      data: {},
    });
    await service.from('audit_logs').insert({
      actor_id: user.id,
      action: 'fleet.grant_trial',
      entity_type: 'user',
      entity_id: body.userId,
      before_state: { account_type: profile2.account_type },
      after_state: { account_type: 'fleet', trial_days: body.days, trial_ends_at: periodEnd },
    });
    return NextResponse.json({ ok: true, trialEndsAt: periodEnd });
  }

  // adjust_credits
  const { data: newBalance, error } = await service.rpc('add_credits', {
    p_garage_id: body.garageId,
    p_amount: body.amount,
    p_type: 'admin_adjustment',
    p_description: body.reason,
  });
  if (error) {
    const status = /check constraint|credit_wallets_balance_check/i.test(error.message) ? 409 : 500;
    return NextResponse.json(
      { error: status === 409 ? 'BALANCE_WOULD_GO_NEGATIVE' : error.message },
      { status },
    );
  }
  await service.from('audit_logs').insert({
    actor_id: user.id,
    action: 'wallet.admin_adjustment',
    entity_type: 'credit_wallet',
    entity_id: body.garageId,
    after_state: { amount: body.amount, balance_after: newBalance, reason: body.reason },
  });
  return NextResponse.json({ ok: true, balance: newBalance });
}

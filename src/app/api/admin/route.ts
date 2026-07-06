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

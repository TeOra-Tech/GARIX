import { NextResponse } from 'next/server';
import { reconcile, requireFleetUser } from '@/lib/fleet/server';

/**
 * Pulls the fleet subscription's current state from Stripe into
 * fleet_subscriptions and returns it. Called by the billing page on load and
 * after returning from Checkout/Portal, so the flow works even without the
 * async webhook.
 */
export async function POST() {
  let ctx;
  try {
    ctx = await requireFleetUser();
  } catch (e) {
    const err = e as { status: number; code: string };
    return NextResponse.json({ error: err.code }, { status: err.status });
  }
  try {
    const row = await reconcile(ctx.admin, ctx.userId);
    return NextResponse.json({ subscription: row ?? null });
  } catch {
    return NextResponse.json({ error: 'RECONCILE_FAILED' }, { status: 500 });
  }
}

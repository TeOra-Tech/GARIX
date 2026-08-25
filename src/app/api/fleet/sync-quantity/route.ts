import { NextResponse } from 'next/server';
import { reconcile, requireFleetUser, stripeClient, vehicleCount } from '@/lib/fleet/server';

/**
 * Sets the subscription's billed quantity to the account's current vehicle
 * count (min 1), with proration. Recomputes the count server-side — never
 * trusts the client. Called after a fleet vehicle is added or removed.
 */
export async function POST() {
  let ctx;
  try {
    ctx = await requireFleetUser();
  } catch (e) {
    const err = e as { status: number; code: string };
    return NextResponse.json({ error: err.code }, { status: err.status });
  }
  const { userId, admin } = ctx;

  try {
    const { data: row } = await admin
      .from('fleet_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (!row?.stripe_subscription_id || !row.stripe_item_id) {
      return NextResponse.json({ synced: false, reason: 'NO_SUBSCRIPTION' });
    }
    if (row.status !== 'active' && row.status !== 'trialing') {
      return NextResponse.json({ synced: false, reason: 'NOT_ACTIVE' });
    }

    const count = await vehicleCount(admin, userId);
    const quantity = Math.max(1, count);
    const stripe = stripeClient();
    await stripe.subscriptionItems.update(row.stripe_item_id, {
      quantity,
      proration_behavior: 'create_prorations',
    });

    const updated = await reconcile(admin, userId);
    return NextResponse.json({ synced: true, quantity, subscription: updated ?? null });
  } catch {
    return NextResponse.json({ error: 'SYNC_FAILED' }, { status: 500 });
  }
}

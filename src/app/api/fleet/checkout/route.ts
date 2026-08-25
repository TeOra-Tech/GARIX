import { NextResponse } from 'next/server';
import {
  appOrigin,
  fleetPriceId,
  requireFleetUser,
  stripeClient,
  vehicleCount,
} from '@/lib/fleet/server';

/**
 * Starts (or re-opens) the fleet per-vehicle subscription checkout.
 * mode=subscription; quantity = current vehicle count (min 1). Server-side only:
 * price comes from settings, ownership is verified, and the fleet_subscriptions
 * row is keyed to the signed-in user.
 */
export async function POST(request: Request) {
  let ctx;
  try {
    ctx = await requireFleetUser();
  } catch (e) {
    const err = e as { status: number; code: string };
    return NextResponse.json({ error: err.code }, { status: err.status });
  }
  const { userId, email, admin } = ctx;
  const stripe = stripeClient();

  try {
    const priceId = await fleetPriceId(admin);

    // ensure a fleet_subscriptions row + a stripe customer
    const { data: row } = await admin
      .from('fleet_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (row?.status === 'active' || row?.status === 'trialing') {
      return NextResponse.json({ error: 'ALREADY_ACTIVE', alreadyActive: true }, { status: 409 });
    }

    let customerId = row?.stripe_customer_id ?? null;
    if (!customerId) {
      const customer = await stripe.customers.create({ email, metadata: { user_id: userId } });
      customerId = customer.id;
      await admin.from('fleet_subscriptions').upsert(
        { user_id: userId, stripe_customer_id: customerId, status: row?.status ?? 'incomplete' },
        { onConflict: 'user_id' },
      );
    }

    const count = await vehicleCount(admin, userId);
    const quantity = Math.max(1, count);
    const origin = appOrigin(request);

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity }],
      subscription_data: { metadata: { user_id: userId } },
      metadata: { user_id: userId },
      allow_promotion_codes: true,
      success_url: `${origin}/dashboard/billing?setup=success`,
      cancel_url: `${origin}/dashboard/billing?setup=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    const err = e as { status?: number; code?: string; message?: string };
    if (err.status && err.code) return NextResponse.json({ error: err.code }, { status: err.status });
    return NextResponse.json({ error: 'CHECKOUT_FAILED' }, { status: 500 });
  }
}

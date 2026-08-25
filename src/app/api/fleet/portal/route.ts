import { NextResponse } from 'next/server';
import { appOrigin, requireFleetUser, stripeClient } from '@/lib/fleet/server';

/**
 * Opens the Stripe Billing Portal so a fleet owner can update their card,
 * fix a past-due payment, or cancel. Returns a one-time portal URL.
 */
export async function POST(request: Request) {
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
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .maybeSingle();
    if (!row?.stripe_customer_id) {
      return NextResponse.json({ error: 'NO_CUSTOMER' }, { status: 409 });
    }
    const stripe = stripeClient();
    const portal = await stripe.billingPortal.sessions.create({
      customer: row.stripe_customer_id,
      return_url: `${appOrigin(request)}/dashboard/billing`,
    });
    return NextResponse.json({ url: portal.url });
  } catch {
    return NextResponse.json({ error: 'PORTAL_FAILED' }, { status: 500 });
  }
}

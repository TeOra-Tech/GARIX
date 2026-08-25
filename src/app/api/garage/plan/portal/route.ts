import { NextResponse } from 'next/server';
import { appOrigin, requireGarageOwner, stripeClient } from '@/lib/garage-plan/server';

/** Open the Stripe Billing Portal for a garage's Pro subscription (manage/cancel). */
export async function POST(request: Request) {
  const { garageId } = await request.json().catch(() => ({ garageId: '' }));
  let ctx;
  try {
    ctx = await requireGarageOwner(garageId);
  } catch (e) {
    const err = e as { status: number; code: string };
    return NextResponse.json({ error: err.code }, { status: err.status });
  }
  try {
    const { data: row } = await ctx.admin
      .from('garage_subscriptions')
      .select('stripe_customer_id')
      .eq('garage_id', garageId)
      .maybeSingle();
    if (!row?.stripe_customer_id) return NextResponse.json({ error: 'NO_CUSTOMER' }, { status: 409 });
    const stripe = stripeClient();
    const portal = await stripe.billingPortal.sessions.create({
      customer: row.stripe_customer_id,
      return_url: `${appOrigin(request)}/dashboard/garages/${garageId}/plan`,
    });
    return NextResponse.json({ url: portal.url });
  } catch {
    return NextResponse.json({ error: 'PORTAL_FAILED' }, { status: 500 });
  }
}

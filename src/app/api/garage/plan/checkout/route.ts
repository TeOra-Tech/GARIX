import { NextResponse } from 'next/server';
import { appOrigin, proPriceId, requireGarageOwner, stripeClient } from '@/lib/garage-plan/server';

/** Start the €49/mo garage Pro subscription checkout for a garage the caller owns. */
export async function POST(request: Request) {
  const { garageId } = await request.json().catch(() => ({ garageId: '' }));
  let ctx;
  try {
    ctx = await requireGarageOwner(garageId);
  } catch (e) {
    const err = e as { status: number; code: string };
    return NextResponse.json({ error: err.code }, { status: err.status });
  }
  const { userId, email, admin } = ctx;
  const stripe = stripeClient();

  try {
    const priceId = await proPriceId(admin);
    const { data: row } = await admin
      .from('garage_subscriptions')
      .select('*')
      .eq('garage_id', garageId)
      .maybeSingle();

    if (row?.status === 'active' || row?.status === 'trialing') {
      return NextResponse.json({ error: 'ALREADY_PRO', alreadyPro: true }, { status: 409 });
    }

    let customerId = row?.stripe_customer_id ?? null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email, metadata: { user_id: userId, garage_id: garageId },
      });
      customerId = customer.id;
      await admin.from('garage_subscriptions').upsert(
        { garage_id: garageId, stripe_customer_id: customerId, status: row?.status ?? 'incomplete' },
        { onConflict: 'garage_id' },
      );
    }

    const origin = appOrigin(request);
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: { metadata: { garage_id: garageId } },
      metadata: { garage_id: garageId },
      allow_promotion_codes: true,
      success_url: `${origin}/dashboard/garages/${garageId}/plan?setup=success`,
      cancel_url: `${origin}/dashboard/garages/${garageId}/plan?setup=cancelled`,
    });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    const err = e as { status?: number; code?: string };
    if (err.status && err.code) return NextResponse.json({ error: err.code }, { status: err.status });
    return NextResponse.json({ error: 'CHECKOUT_FAILED' }, { status: 500 });
  }
}

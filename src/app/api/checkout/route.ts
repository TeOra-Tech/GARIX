import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const bodySchema = z.object({
  garageId: z.string().uuid(),
  creditPackId: z.string().uuid(),
});

/**
 * Creates a Stripe Checkout session for a credit pack.
 * Server-side only: the price comes from credit_packs (never the client),
 * and fulfilment happens exclusively in the stripe-webhook Edge Function.
 */
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });
  }
  const { garageId, creditPackId } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });

  // RLS returns the garage only to its owner (or admin) for non-active rows,
  // but an active garage is publicly readable — check ownership explicitly.
  const { data: garage } = await supabase
    .from('garages')
    .select('id, owner_id, name')
    .eq('id', garageId)
    .maybeSingle();
  if (!garage || garage.owner_id !== user.id) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  const { data: pack } = await supabase
    .from('credit_packs')
    .select('*')
    .eq('id', creditPackId)
    .eq('is_active', true)
    .maybeSingle();
  if (!pack) return NextResponse.json({ error: 'PACK_NOT_FOUND' }, { status: 404 });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const origin = request.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      pack.stripe_price_id
        ? { price: pack.stripe_price_id, quantity: 1 }
        : {
            quantity: 1,
            price_data: {
              currency: 'eur',
              unit_amount: Math.round(Number(pack.price_eur) * 100),
              product_data: {
                name: `Garix credits — ${pack.credits} credits`,
                description: `Credit top-up for ${garage.name} (1 credit = €1)`,
              },
            },
          },
    ],
    metadata: {
      garage_id: garageId,
      credits: String(pack.credits),
      credit_pack_id: creditPackId,
    },
    success_url: `${origin}/dashboard/wallet?purchase=success`,
    cancel_url: `${origin}/dashboard/wallet?purchase=cancelled`,
  });

  return NextResponse.json({ url: session.url });
}

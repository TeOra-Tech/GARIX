// Garix Edge Function: stripe-webhook
// Handles checkout.session.completed → records payment + adds credits.
// Configure endpoint in Stripe Dashboard; set STRIPE_WEBHOOK_SECRET.
import Stripe from 'npm:stripe@17';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);
const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

Deno.serve(async (req) => {
  const sig = req.headers.get('stripe-signature');
  const raw = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      raw, sig!, Deno.env.get('STRIPE_WEBHOOK_SECRET')!,
    );
  } catch {
    return new Response('Invalid signature', { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const garageId = session.metadata?.garage_id;
    const credits = Number(session.metadata?.credits ?? 0);
    const packId = session.metadata?.credit_pack_id ?? null;

    if (garageId && credits > 0) {
      // Idempotency: skip if this session was already processed
      const { data: existing } = await admin
        .from('payments').select('id')
        .eq('stripe_checkout_session_id', session.id).maybeSingle();

      if (!existing) {
        const { data: payment } = await admin.from('payments').insert({
          garage_id: garageId,
          credit_pack_id: packId,
          stripe_checkout_session_id: session.id,
          stripe_payment_intent_id: session.payment_intent as string,
          amount_eur: (session.amount_total ?? 0) / 100,
          credits_purchased: credits,
          status: 'succeeded',
        }).select().single();

        await admin.rpc('add_credits', {
          p_garage_id: garageId, p_amount: credits, p_type: 'purchase',
          p_reference: payment?.id,
          p_description: `Credit pack purchase (${credits} credits)`,
        });

        const { data: g } = await admin
          .from('garages').select('owner_id').eq('id', garageId).single();
        if (g) {
          await admin.from('notifications').insert({
            user_id: g.owner_id, type: 'credit_purchase',
            title: 'Credits added',
            body: `${credits} credits have been added to your wallet.`,
          });
        }
      }
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});

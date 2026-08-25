// Garix Edge Function: stripe-webhook
// Handles:
//  - checkout.session.completed (mode=payment)      → records payment + adds garage credits
//  - checkout.session.completed (mode=subscription) → links the fleet subscription
//  - customer.subscription.created/updated/deleted  → syncs fleet_subscriptions
//  - invoice.paid / invoice.payment_failed          → refreshes fleet subscription status
// Configure endpoint in Stripe Dashboard; set STRIPE_WEBHOOK_SECRET.
import Stripe from 'npm:stripe@17';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);
const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

async function syncFleetFromSubscription(sub: Stripe.Subscription) {
  const item = sub.items?.data?.[0];
  // find the fleet user: subscription metadata first, else by stripe customer id
  let userId = sub.metadata?.user_id as string | undefined;
  if (!userId) {
    const { data } = await admin
      .from('fleet_subscriptions')
      .select('user_id')
      .eq('stripe_customer_id', sub.customer as string)
      .maybeSingle();
    userId = data?.user_id;
  }
  if (!userId) return;

  const periodEnd =
    (sub as unknown as { current_period_end?: number }).current_period_end ??
    (item as unknown as { current_period_end?: number })?.current_period_end;

  await admin.from('fleet_subscriptions').upsert(
    {
      user_id: userId,
      stripe_customer_id: sub.customer as string,
      stripe_subscription_id: sub.id,
      stripe_item_id: item?.id ?? null,
      status: sub.status,
      quantity: item?.quantity ?? 0,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      cancel_at_period_end: sub.cancel_at_period_end ?? false,
    },
    { onConflict: 'user_id' },
  );

  // notify the owner when billing needs attention
  if (sub.status === 'past_due' || sub.status === 'unpaid') {
    await admin.from('notifications').insert({
      user_id: userId,
      type: 'system',
      title: 'Fleet payment needs attention',
      body: 'Your fleet subscription payment failed. Update your payment method to keep adding vehicles.',
      data: { kind: 'fleet_billing', link: '/dashboard/billing' },
    });
  }
}

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

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        // ----- Fleet subscription checkout -----
        if (session.mode === 'subscription' && session.subscription) {
          const sub = await stripe.subscriptions.retrieve(session.subscription as string);
          if (!sub.metadata?.user_id && session.metadata?.user_id) {
            sub.metadata = { ...sub.metadata, user_id: session.metadata.user_id };
          }
          await syncFleetFromSubscription(sub);
          break;
        }

        // ----- Garage credit purchase (one-time) -----
        const garageId = session.metadata?.garage_id;
        const credits = Number(session.metadata?.credits ?? 0);
        const packId = session.metadata?.credit_pack_id ?? null;
        if (garageId && credits > 0) {
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
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        await syncFleetFromSubscription(event.data.object as Stripe.Subscription);
        break;
      }

      case 'invoice.paid':
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = (invoice as unknown as { subscription?: string }).subscription;
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          await syncFleetFromSubscription(sub);
        }
        break;
      }
    }
  } catch (e) {
    // Log but return 200 so Stripe doesn't hammer retries on non-signature errors;
    // subscription events are also reconciled by the sync route.
    console.error('webhook handler error', (e as Error).message);
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});

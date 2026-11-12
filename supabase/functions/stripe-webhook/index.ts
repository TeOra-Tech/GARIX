// Garix Edge Function: stripe-webhook
// Handles:
//  - checkout.session.completed (mode=payment)      → records payment + adds garage credits
//  - checkout.session.completed (mode=subscription) → links the fleet subscription
//  - customer.subscription.created/updated/deleted  → syncs fleet_subscriptions
//  - invoice.paid / invoice.payment_failed          → refreshes fleet subscription status
// Configure endpoint in Stripe Dashboard; set STRIPE_WEBHOOK_SECRET.
import Stripe from 'npm:stripe@17';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { recordAppTransaction } from '../_shared/app-purchases.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);
const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

async function syncGarageFromSubscription(sub: Stripe.Subscription) {
  const item = sub.items?.data?.[0];
  let garageId = sub.metadata?.garage_id as string | undefined;
  if (!garageId) {
    const { data } = await admin
      .from('garage_subscriptions')
      .select('garage_id')
      .eq('stripe_customer_id', sub.customer as string)
      .maybeSingle();
    garageId = data?.garage_id;
  }
  if (!garageId) return;

  const periodEnd =
    (sub as unknown as { current_period_end?: number }).current_period_end ??
    (item as unknown as { current_period_end?: number })?.current_period_end;

  await admin.from('garage_subscriptions').upsert(
    {
      garage_id: garageId,
      stripe_customer_id: sub.customer as string,
      stripe_subscription_id: sub.id,
      stripe_item_id: item?.id ?? null,
      status: sub.status,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      cancel_at_period_end: sub.cancel_at_period_end ?? false,
    },
    { onConflict: 'garage_id' },
  );

  // cache the plan on the garage for easy UI/search reads
  const isPro = sub.status === 'active' || sub.status === 'trialing';
  await admin.from('garages').update({ plan: isPro ? 'pro' : 'basic' }).eq('id', garageId);

  if (sub.status === 'past_due' || sub.status === 'unpaid') {
    const { data: g } = await admin.from('garages').select('owner_id').eq('id', garageId).single();
    if (g) {
      await admin.from('notifications').insert({
        user_id: g.owner_id, type: 'system',
        title: 'Pro subscription payment failed',
        body: 'Your garage Pro payment failed. Update your payment method to keep your Pro features.',
        data: { kind: 'garage_plan_billing', link: '/dashboard/garages' },
      });
    }
  }
}

function isGarageSub(sub: Stripe.Subscription): boolean {
  return !!sub.metadata?.garage_id;
}

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

        // ----- Started in the mobile app: store for Apple/Google reporting -----
        const appLinkId = session.metadata?.app_link_id;
        if (appLinkId && session.payment_status === 'paid') {
          await recordAppTransaction(admin, {
            linkId: appLinkId,
            kind: 'purchase',
            stripeRef: session.id,
            subscriptionId: (session.subscription as string | null) ?? null,
            amountCents: session.amount_total ?? 0,
            taxCents: session.total_details?.amount_tax ?? 0,
            currency: session.currency ?? 'eur',
            occurredAt: new Date(event.created * 1000),
          });
        }

        // ----- Subscription checkout (garage Pro or fleet) -----
        if (session.mode === 'subscription' && session.subscription) {
          const sub = await stripe.subscriptions.retrieve(session.subscription as string);
          const md = session.metadata ?? {};
          sub.metadata = { ...sub.metadata, ...md };
          if (isGarageSub(sub)) await syncGarageFromSubscription(sub);
          else await syncFleetFromSubscription(sub);
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
        const sub = event.data.object as Stripe.Subscription;
        if (isGarageSub(sub)) await syncGarageFromSubscription(sub);
        else await syncFleetFromSubscription(sub);
        break;
      }

      case 'invoice.paid':
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = (invoice as unknown as { subscription?: string }).subscription;
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          if (isGarageSub(sub)) await syncGarageFromSubscription(sub);
          else await syncFleetFromSubscription(sub);
          // Renewals of a Pro plan bought from the app are reported to the store too.
          if (event.type === 'invoice.paid' && invoice.billing_reason === 'subscription_cycle' && sub.metadata?.app_link_id) {
            await recordAppTransaction(admin, {
              linkId: sub.metadata.app_link_id,
              kind: 'renewal',
              stripeRef: invoice.id!,
              subscriptionId: sub.id,
              amountCents: invoice.amount_paid,
              taxCents: (invoice as unknown as { tax?: number | null }).tax ?? 0,
              currency: invoice.currency,
              occurredAt: new Date(event.created * 1000),
            });
          }
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

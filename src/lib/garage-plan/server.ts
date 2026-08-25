import type Stripe from 'stripe';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { appOrigin, stripeClient, type Admin } from '@/lib/fleet/server';

export { appOrigin, stripeClient };
export type { Admin };

/** Verify the caller owns this garage. Returns the owner's email + an admin client. */
export async function requireGarageOwner(
  garageId: string,
): Promise<{ userId: string; email: string; admin: Admin }> {
  if (!garageId || typeof garageId !== 'string') throw { status: 400, code: 'INVALID_BODY' };
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw { status: 401, code: 'UNAUTHENTICATED' };

  const admin = createAdminClient();
  const { data: garage } = await admin
    .from('garages')
    .select('id, owner_id')
    .eq('id', garageId)
    .maybeSingle();
  if (!garage || garage.owner_id !== user.id) throw { status: 403, code: 'FORBIDDEN' };

  const { data: profile } = await admin
    .from('user_profiles')
    .select('email')
    .eq('id', user.id)
    .single();

  return { userId: user.id, email: profile?.email ?? '', admin };
}

export async function proPriceId(admin: Admin): Promise<string> {
  const { data } = await admin
    .from('system_settings')
    .select('value')
    .eq('key', 'plans.pro_stripe_price_id')
    .single();
  const id = (data?.value as { id?: string } | null)?.id;
  if (!id || id === 'set-operationally') throw { status: 500, code: 'PRO_PRICE_UNCONFIGURED' };
  return id;
}

export async function syncGarageSubscriptionRow(admin: Admin, sub: Stripe.Subscription, garageId: string) {
  const item = sub.items?.data?.[0];
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
  const isPro = sub.status === 'active' || sub.status === 'trialing';
  await admin.from('garages').update({ plan: isPro ? 'pro' : 'basic' }).eq('id', garageId);
}

/** Pull the garage's latest subscription from Stripe into the DB. */
export async function reconcileGarage(admin: Admin, garageId: string) {
  const { data: row } = await admin
    .from('garage_subscriptions')
    .select('*')
    .eq('garage_id', garageId)
    .maybeSingle();
  if (!row?.stripe_customer_id) return row ?? null;

  const stripe = stripeClient();
  const subs = await stripe.subscriptions.list({ customer: row.stripe_customer_id, status: 'all', limit: 1 });
  const sub = subs.data[0];
  if (!sub) return row;
  await syncGarageSubscriptionRow(admin, sub, garageId);
  const { data: updated } = await admin
    .from('garage_subscriptions')
    .select('*')
    .eq('garage_id', garageId)
    .maybeSingle();
  return updated;
}

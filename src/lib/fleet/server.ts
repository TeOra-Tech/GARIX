import Stripe from 'stripe';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Database } from '@/types/database';

export type Admin = SupabaseClient<Database>;

export function stripeClient() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

export function appOrigin(request: Request): string {
  return request.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
}

/**
 * Verify the caller is signed in and is a fleet account. Returns the user id,
 * email and a service-role admin client. Throws a Response-shaped error object
 * ({ status, code }) the route handler turns into a JSON response.
 */
export async function requireFleetUser(): Promise<{ userId: string; email: string; admin: Admin }> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw { status: 401, code: 'UNAUTHENTICATED' };

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('account_type, email')
    .eq('id', user.id)
    .single();
  if (!profile) throw { status: 404, code: 'NO_PROFILE' };
  if (profile.account_type !== 'fleet') throw { status: 403, code: 'NOT_FLEET' };

  return { userId: user.id, email: profile.email, admin: createAdminClient() };
}

export async function fleetPriceId(admin: Admin): Promise<string> {
  const { data } = await admin
    .from('system_settings')
    .select('value')
    .eq('key', 'fleet.stripe_price_id')
    .single();
  const id = (data?.value as { id?: string } | null)?.id;
  if (!id || id === 'set-operationally') throw { status: 500, code: 'FLEET_PRICE_UNCONFIGURED' };
  return id;
}

export async function vehicleCount(admin: Admin, userId: string): Promise<number> {
  const { count } = await admin
    .from('vehicles')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', userId);
  return count ?? 0;
}

/** Persist a Stripe subscription's state into fleet_subscriptions (service role). */
export async function syncSubscriptionRow(admin: Admin, sub: Stripe.Subscription, userId: string) {
  const item = sub.items?.data?.[0];
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
}

/** Pull the customer's latest subscription from Stripe and store it. Returns the row-ish state. */
export async function reconcile(admin: Admin, userId: string) {
  const { data: row } = await admin
    .from('fleet_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (!row?.stripe_customer_id) return row ?? null;

  const stripe = stripeClient();
  const subs = await stripe.subscriptions.list({
    customer: row.stripe_customer_id,
    status: 'all',
    limit: 1,
  });
  const sub = subs.data[0];
  if (!sub) return row;
  await syncSubscriptionRow(admin, sub, userId);
  const { data: updated } = await admin
    .from('fleet_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  return updated;
}

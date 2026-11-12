// Purchases started in the mobile app carry metadata.app_link_id (see migration 00030).
// Every resulting payment is stored in app_purchase_transactions; Android ones are
// reported to Google straight away (24-hour deadline), iOS ones go in Apple's monthly report.
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import { googlePlayConfigured, reportExternalTransaction } from './google-play.ts';

export type AppTransactionInput = {
  linkId: string;
  kind: 'purchase' | 'renewal';
  stripeRef: string;
  subscriptionId?: string | null;
  amountCents: number;
  taxCents: number;
  currency: string;
  occurredAt: Date;
};

export async function recordAppTransaction(admin: SupabaseClient, t: AppTransactionInput): Promise<void> {
  const { data: link } = await admin
    .from('app_purchase_links')
    .select('id, platform, product, external_token')
    .eq('id', t.linkId)
    .maybeSingle();
  if (!link) {
    console.error('app purchase: unknown link', t.linkId);
    return;
  }

  const { data: row, error } = await admin
    .from('app_purchase_transactions')
    .insert({
      link_id: t.linkId,
      kind: t.kind,
      stripe_ref: t.stripeRef,
      stripe_subscription_id: t.subscriptionId ?? null,
      amount_cents: t.amountCents,
      tax_cents: t.taxCents,
      currency: t.currency.toUpperCase(),
      occurred_at: t.occurredAt.toISOString(),
    })
    .select('id')
    .single();
  if (error) {
    // 23505 = already recorded (Stripe redelivered the event).
    if ((error as { code?: string }).code !== '23505') console.error('app purchase: insert failed', error.message);
    return;
  }

  if (link.platform === 'android') await reportToGoogle(admin, row.id);
}

/** Reports one stored Android transaction; safe to retry (records the error otherwise). */
export async function reportToGoogle(admin: SupabaseClient, transactionId: string): Promise<boolean> {
  const { data: tx } = await admin
    .from('app_purchase_transactions')
    .select('id, link_id, kind, amount_cents, tax_cents, currency, occurred_at, google_reported_at, app_purchase_links(platform, product, external_token)')
    .eq('id', transactionId)
    .single();
  const link = tx?.app_purchase_links as unknown as { platform: string; product: string; external_token: string | null } | null;
  if (!tx || !link || link.platform !== 'android' || tx.google_reported_at) return true;

  const fail = async (message: string) => {
    await admin.from('app_purchase_transactions').update({ google_report_error: message.slice(0, 500) }).eq('id', tx.id);
    console.error('google report failed', tx.id, message);
    return false;
  };
  if (!googlePlayConfigured()) return fail('GOOGLE_PLAY_NOT_CONFIGURED');

  const base = {
    externalTransactionId: tx.id,
    amountCents: tx.amount_cents,
    taxCents: tx.tax_cents,
    currency: tx.currency,
    transactionTime: new Date(tx.occurred_at).toISOString(),
  };
  try {
    if (tx.kind === 'renewal') {
      const { data: initial } = await admin
        .from('app_purchase_transactions')
        .select('id')
        .eq('link_id', tx.link_id)
        .eq('kind', 'purchase')
        .maybeSingle();
      if (!initial) return fail('INITIAL_TRANSACTION_MISSING');
      await reportExternalTransaction({ ...base, kind: 'subscription_renewal', initialExternalTransactionId: initial.id });
    } else {
      if (!link.external_token) return fail('NO_EXTERNAL_TOKEN');
      await reportExternalTransaction({ ...base, kind: link.product === 'pro' ? 'subscription_initial' : 'one_time', token: link.external_token });
    }
  } catch (e) {
    return fail((e as Error).message);
  }
  await admin
    .from('app_purchase_transactions')
    .update({ google_reported_at: new Date().toISOString(), google_report_error: null })
    .eq('id', tx.id);
  return true;
}

// Reports iOS app purchase tokens to Apple (External Purchase Server API), one report per
// externalPurchaseId:
//   * tokens with unreported payments -> LINE_ITEM with those payments
//   * tokens whose taps produced no payment -> NO_LINE_ITEM, once a purchase can no longer
//     attach to them (the app link expires after 7 days, see src/lib/app-purchases/server.ts)
//   * tokens Apple says are unreported but we never saw -> UNRECOGNIZED_TOKEN
// Every report is stored in apple_external_purchase_reports (migration 00031).
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import { appleEnvironment, appleReportBody, decodeAppleToken, periodDays, type AppleReportStatus, type AppleTx } from './apple-report-body.ts';
import { appleBundleId, appleReportingConfigured, sendAppleReport } from './apple-external-purchase.ts';

const NO_PURCHASE_AFTER_MS = 8 * 86_400_000;

type LinkRow = { id: string; product: 'credits' | 'pro'; created_at: string; apple_reported_at: string | null };
type TxRow = {
  id: string; link_id: string; kind: 'purchase' | 'renewal' | 'refund'; stripe_subscription_id: string | null;
  amount_cents: number; tax_cents: number; currency: string; occurred_at: string;
  period_start: string | null; period_end: string | null; apple_reported_at: string | null;
};
const TX_COLS = 'id, link_id, kind, stripe_subscription_id, amount_cents, tax_cents, currency, occurred_at, period_start, period_end, apple_reported_at';

/** Fills apple_external_purchase_id / apple_token_expires_at from the stored tokens. */
async function decodeNewTokens(admin: SupabaseClient): Promise<void> {
  const { data } = await admin
    .from('app_purchase_links')
    .select('id, external_token')
    .eq('platform', 'ios')
    .not('external_token', 'is', null)
    .is('apple_external_purchase_id', null)
    .limit(500);
  for (const row of data ?? []) {
    const t = decodeAppleToken(row.external_token as string);
    if (!t) {
      console.error('apple: undecodable token on link', row.id);
      continue;
    }
    if (t.bundleId && t.bundleId !== appleBundleId()) console.error('apple: token for another bundle', row.id, t.bundleId);
    await admin
      .from('app_purchase_links')
      .update({
        apple_external_purchase_id: t.externalPurchaseId,
        apple_token_expires_at: t.tokenExpirationDate ? new Date(t.tokenExpirationDate).toISOString() : null,
      })
      .eq('id', row.id);
  }
}

async function send(admin: SupabaseClient, epid: string, status: AppleReportStatus, txs: AppleTx[] = []) {
  const requestIdentifier = crypto.randomUUID();
  const environment = appleEnvironment(epid);
  const body = appleReportBody(requestIdentifier, epid, status, txs);
  const result = await sendAppleReport(environment, body);
  await admin.from('apple_external_purchase_reports').insert({
    request_identifier: requestIdentifier,
    external_purchase_id: epid,
    status,
    environment,
    body,
    http_status: result.status,
    response: result.response || null,
  });
  if (!result.ok) console.error('apple report failed', epid, status, result.status, result.response.slice(0, 300));
  return result;
}

/** Turns stored payments into Apple line items (renewals need the subscription start). */
async function toAppleTxs(admin: SupabaseClient, txs: TxRow[], productOf: Map<string, LinkRow['product']>): Promise<AppleTx[]> {
  const out: AppleTx[] = [];
  for (const tx of txs) {
    if (tx.kind === 'refund') continue; // refunds aren't recorded yet
    const product = productOf.get(tx.link_id) ?? 'credits';
    const item: AppleTx = {
      id: tx.id, kind: tx.kind, product, amountCents: tx.amount_cents, taxCents: tx.tax_cents,
      currency: tx.currency, occurredAt: tx.occurred_at, periodStart: tx.period_start, periodEnd: tx.period_end,
    };
    if (tx.kind === 'renewal' && tx.stripe_subscription_id) {
      const { data: earlier } = await admin
        .from('app_purchase_transactions')
        .select('id, kind, occurred_at, period_start, period_end')
        .eq('stripe_subscription_id', tx.stripe_subscription_id)
        .lt('occurred_at', tx.occurred_at)
        .order('occurred_at');
      item.initialLineItemId = earlier?.find((e) => e.kind === 'purchase')?.id ?? null;
      item.daysOfPaidService = (earlier ?? [])
        .filter((e) => e.kind !== 'refund')
        .reduce((sum, e) => sum + (e.period_start && e.period_end ? periodDays(e.period_start, e.period_end) : 30), 0);
    }
    out.push(item);
  }
  return out;
}

/**
 * Reports one token if anything about it is due. `force` sends NO_LINE_ITEM straight away
 * (Apple has told us the token is unreported). Returns what was done.
 */
async function reportToken(admin: SupabaseClient, epid: string, force = false): Promise<string> {
  const { data: links } = await admin
    .from('app_purchase_links')
    .select('id, product, created_at, apple_reported_at')
    .eq('apple_external_purchase_id', epid);
  if (!links?.length) return 'unknown';
  const linkIds = links.map((l) => l.id);
  const { data: txRows } = await admin.from('app_purchase_transactions').select(TX_COLS).in('link_id', linkIds).order('occurred_at');
  const txs = (txRows ?? []) as TxRow[];
  const markLinks = () =>
    admin.from('app_purchase_links').update({ apple_reported_at: new Date().toISOString() }).in('id', linkIds).is('apple_reported_at', null);

  const pending = txs.filter((t) => !t.apple_reported_at && t.kind !== 'refund');
  if (pending.length) {
    const productOf = new Map((links as LinkRow[]).map((l) => [l.id, l.product]));
    let items: AppleTx[];
    try {
      items = await toAppleTxs(admin, pending, productOf);
    } catch (e) {
      await admin.from('app_purchase_transactions').update({ apple_report_error: (e as Error).message }).in('id', pending.map((t) => t.id));
      return 'error';
    }
    const result = await send(admin, epid, 'LINE_ITEM', items);
    if (!result.ok) {
      await admin
        .from('app_purchase_transactions')
        .update({ apple_report_error: `APPLE_${result.status}: ${result.response.slice(0, 400)}` })
        .in('id', pending.map((t) => t.id));
      return 'error';
    }
    await admin
      .from('app_purchase_transactions')
      .update({ apple_reported_at: new Date().toISOString(), apple_report_error: null })
      .in('id', pending.map((t) => t.id));
    await markLinks();
    return 'line_items';
  }

  if (links.every((l) => l.apple_reported_at)) return 'done';
  if (txs.length) {
    // Already reported with its payments; later taps on the same token need nothing more.
    await markLinks();
    return 'done';
  }
  const lastTap = Math.max(...links.map((l) => new Date(l.created_at).getTime()));
  if (!force && Date.now() - lastTap < NO_PURCHASE_AFTER_MS) return 'waiting';
  const result = await send(admin, epid, 'NO_LINE_ITEM');
  if (!result.ok) return 'error';
  await markLinks();
  return 'no_line_item';
}

/** Daily job: reports every token that's due. */
export async function reportDueAppleTokens(admin: SupabaseClient): Promise<Record<string, number>> {
  if (!appleReportingConfigured()) return { skipped_not_configured: 1 };
  await decodeNewTokens(admin);

  const cutoff = new Date(Date.now() - 5 * 60_000).toISOString();
  const ids = new Set<string>();
  const { data: openLinks } = await admin
    .from('app_purchase_links')
    .select('apple_external_purchase_id')
    .eq('platform', 'ios')
    .not('apple_external_purchase_id', 'is', null)
    .is('apple_reported_at', null)
    .limit(500);
  for (const l of openLinks ?? []) ids.add(l.apple_external_purchase_id as string);
  const { data: openTxs } = await admin
    .from('app_purchase_transactions')
    .select('app_purchase_links!inner(platform, apple_external_purchase_id)')
    .is('apple_reported_at', null)
    .eq('app_purchase_links.platform', 'ios')
    .lt('created_at', cutoff)
    .limit(500);
  for (const t of openTxs ?? []) {
    const epid = (t.app_purchase_links as unknown as { apple_external_purchase_id: string | null }).apple_external_purchase_id;
    if (epid) ids.add(epid);
  }

  const counts: Record<string, number> = {};
  for (const epid of ids) {
    const outcome = await reportToken(admin, epid);
    counts[outcome] = (counts[outcome] ?? 0) + 1;
  }
  return counts;
}

/** App Store Server Notification EXTERNAL_PURCHASE_TOKEN / UNREPORTED for this token. */
export async function reportUnreportedToken(admin: SupabaseClient, epid: string): Promise<string> {
  if (!appleReportingConfigured()) return 'not_configured';
  await decodeNewTokens(admin);
  const outcome = await reportToken(admin, epid, true);
  if (outcome !== 'unknown') return outcome;
  const result = await send(admin, epid, 'UNRECOGNIZED_TOKEN');
  return result.ok ? 'unrecognized' : 'error';
}

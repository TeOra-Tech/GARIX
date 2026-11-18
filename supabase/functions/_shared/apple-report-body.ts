// Pure helpers for Apple's External Purchase Server API reports (no Deno APIs, so the
// web test suite can import this file). Spec: developer.apple.com/documentation/
// externalpurchaseserverapi — ExternalPurchaseReport, OneTimeBuyLineItem, SubscriptionBuyLineItem.
//
// Amounts are milli-units of the currency (EUR 2.99 = 2990), dates are UNIX milliseconds,
// taxCountry is ISO 3166-1 alpha-3.

export const APPLE_PRODUCT_IDS = { credits: 'ie.garix.credits', pro: 'ie.garix.pro.monthly' } as const;

export type AppleToken = {
  externalPurchaseId: string;
  bundleId?: string;
  appAppleId?: number;
  tokenCreationDate?: number;
  tokenType?: 'ACQUISITION' | 'SERVICES' | string;
  tokenExpirationDate?: number;
};

/** The token is Base64URL-encoded JSON; returns null if it isn't one. */
export function decodeAppleToken(token: string): AppleToken | null {
  try {
    const b64 = token.trim().replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const bin = atob(padded);
    const json = new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
    const t = JSON.parse(json) as AppleToken;
    return typeof t.externalPurchaseId === 'string' && t.externalPurchaseId ? t : null;
  } catch {
    return null;
  }
}

/** Sandbox tokens have an externalPurchaseId starting with SANDBOX and use the sandbox URL. */
export const appleEnvironment = (externalPurchaseId: string): 'production' | 'sandbox' =>
  externalPurchaseId.startsWith('SANDBOX') ? 'sandbox' : 'production';

export type AppleTx = {
  id: string; // used as lineItemId (unique per app)
  kind: 'purchase' | 'renewal';
  product: 'credits' | 'pro';
  amountCents: number; // tax inclusive
  taxCents: number;
  currency: string;
  occurredAt: string; // ISO
  periodStart?: string | null;
  periodEnd?: string | null;
  /** Renewals: lineItemId of the subscription-start line item. */
  initialLineItemId?: string | null;
  /** Paid days before this period (0 for the subscription start). */
  daysOfPaidService?: number;
};

const ms = (iso: string) => new Date(iso).getTime();
const DAY = 86_400_000;

/** Whole days in a subscription period (used to accumulate subscriptionDaysOfPaidService). */
export const periodDays = (start: string, end: string) => Math.max(0, Math.round((ms(end) - ms(start)) / DAY));

/** Default period when Stripe didn't give one: one calendar month from the payment. */
function period(tx: AppleTx): { start: number; end: number } {
  const start = tx.periodStart ? ms(tx.periodStart) : ms(tx.occurredAt);
  if (tx.periodEnd) return { start, end: ms(tx.periodEnd) };
  const d = new Date(start);
  d.setUTCMonth(d.getUTCMonth() + 1);
  return { start, end: d.getTime() };
}

export function appleLineItem(tx: AppleTx): Record<string, unknown> {
  const currency = tx.currency.toUpperCase();
  const inclusive = tx.amountCents * 10;
  const tax = tx.taxCents * 10;
  const exclusive = inclusive - tax;
  const money = {
    pricingCurrency: currency,
    reportingCurrency: currency,
    amountTaxInclusive: inclusive,
    amountTaxExclusive: exclusive,
    taxAmount: tax,
    netAmountTaxExclusive: exclusive, // no refunds reported yet
    taxCountry: 'IRL', // Garix sells to garages in Ireland only
  };
  const base = { lineItemId: tx.id, creationDate: ms(tx.occurredAt), eventType: 'BUY', quantity: 1 };

  if (tx.product === 'credits') {
    return { ...base, productType: 'ONE_TIME_BUY', productIdentifier: APPLE_PRODUCT_IDS.credits, ...money };
  }
  const p = period(tx);
  if (tx.kind === 'renewal' && !tx.initialLineItemId) throw new Error('RENEWAL_WITHOUT_INITIAL_LINE_ITEM');
  return {
    ...base,
    productType: 'SUBSCRIPTION',
    productIdentifier: APPLE_PRODUCT_IDS.pro,
    ...money,
    subscriptionEvent: tx.kind === 'renewal' ? 'RENEWAL' : 'SUBSCRIPTION_START',
    subscriptionStartDate: p.start,
    subscriptionEndDate: p.end,
    subscriptionDaysOfPaidService: tx.kind === 'renewal' ? tx.daysOfPaidService ?? 0 : 0,
    ...(tx.kind === 'renewal' ? { referenceLineItemId: tx.initialLineItemId } : {}),
  };
}

export type AppleReportStatus = 'LINE_ITEM' | 'NO_LINE_ITEM' | 'UNRECOGNIZED_TOKEN';

export function appleReportBody(
  requestIdentifier: string,
  externalPurchaseId: string,
  status: AppleReportStatus,
  txs: AppleTx[] = [],
): Record<string, unknown> {
  if (status !== 'LINE_ITEM') return { requestIdentifier, externalPurchaseId, status };
  if (!txs.length) throw new Error('LINE_ITEM_REPORT_WITHOUT_TRANSACTIONS');
  return { requestIdentifier, externalPurchaseId, status, lineItems: txs.map(appleLineItem) };
}

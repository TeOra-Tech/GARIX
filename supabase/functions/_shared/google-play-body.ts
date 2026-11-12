// Pure builder for the Google Play externaltransactions body (no Deno APIs, so it is unit-tested).

export type GoogleReport = {
  /** Our app_purchase_transactions.id — 1-63 chars of [a-zA-Z0-9_-], unique per app. */
  externalTransactionId: string;
  amountCents: number;
  taxCents: number;
  currency: string;
  transactionTime: string;
} & (
  | { kind: 'one_time'; token: string }
  | { kind: 'subscription_initial'; token: string }
  | { kind: 'subscription_renewal'; initialExternalTransactionId: string }
);

const price = (cents: number, currency: string) => ({ priceMicros: String(cents * 10_000), currency: currency.toUpperCase() });

/** Builds the createexternaltransaction body (exported for tests). */
export function externalTransactionBody(r: GoogleReport) {
  const body: Record<string, unknown> = {
    originalPreTaxAmount: price(r.amountCents - r.taxCents, r.currency),
    originalTaxAmount: price(r.taxCents, r.currency),
    transactionTime: r.transactionTime,
    // Garix only sells to Irish garages.
    userTaxAddress: { regionCode: 'IE' },
  };
  if (r.kind === 'one_time') {
    body.oneTimeTransaction = { externalTransactionToken: r.token };
  } else if (r.kind === 'subscription_initial') {
    body.recurringTransaction = { externalTransactionToken: r.token, externalSubscription: { subscriptionType: 'RECURRING' } };
  } else {
    body.recurringTransaction = { initialExternalTransactionId: r.initialExternalTransactionId, externalSubscription: { subscriptionType: 'RECURRING' } };
  }
  // External offers: required on one-time purchases and the first payment of a subscription.
  if (r.kind !== 'subscription_renewal') body.externalOfferDetails = { linkType: 'LINK_TO_DIGITAL_CONTENT_OFFER' };
  return body;
}

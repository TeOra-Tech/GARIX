import { describe, expect, it } from 'vitest';
import { externalTransactionBody } from '../supabase/functions/_shared/google-play-body';

const base = { externalTransactionId: 'tx-1', amountCents: 4900, taxCents: 0, currency: 'eur', transactionTime: '2026-11-12T10:00:00.000Z' };

describe('Google Play external transaction report', () => {
  it('reports a credit pack as a one-time external offer purchase', () => {
    const body = externalTransactionBody({ ...base, kind: 'one_time', token: 'tok' });
    expect(body).toEqual({
      originalPreTaxAmount: { priceMicros: '49000000', currency: 'EUR' },
      originalTaxAmount: { priceMicros: '0', currency: 'EUR' },
      transactionTime: base.transactionTime,
      userTaxAddress: { regionCode: 'IE' },
      oneTimeTransaction: { externalTransactionToken: 'tok' },
      externalOfferDetails: { linkType: 'LINK_TO_DIGITAL_CONTENT_OFFER' },
    });
  });

  it('reports the first Pro payment as a recurring purchase with the token', () => {
    const body = externalTransactionBody({ ...base, kind: 'subscription_initial', token: 'tok' });
    expect(body.recurringTransaction).toEqual({ externalTransactionToken: 'tok', externalSubscription: { subscriptionType: 'RECURRING' } });
    expect(body.externalOfferDetails).toBeDefined();
  });

  it('reports renewals against the initial transaction, without offer details', () => {
    const body = externalTransactionBody({ ...base, kind: 'subscription_renewal', initialExternalTransactionId: 'tx-0' });
    expect(body.recurringTransaction).toEqual({ initialExternalTransactionId: 'tx-0', externalSubscription: { subscriptionType: 'RECURRING' } });
    expect(body.externalOfferDetails).toBeUndefined();
  });

  it('splits tax out of the total', () => {
    const body = externalTransactionBody({ ...base, amountCents: 1230, taxCents: 230, kind: 'one_time', token: 't' });
    expect(body.originalPreTaxAmount).toEqual({ priceMicros: '10000000', currency: 'EUR' });
    expect(body.originalTaxAmount).toEqual({ priceMicros: '2300000', currency: 'EUR' });
  });
});

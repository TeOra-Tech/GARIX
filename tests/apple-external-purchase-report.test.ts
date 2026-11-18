import { describe, expect, it } from 'vitest';
import {
  appleEnvironment,
  appleLineItem,
  appleReportBody,
  decodeAppleToken,
  periodDays,
} from '../supabase/functions/_shared/apple-report-body';

const b64url = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');

describe('Apple external purchase tokens', () => {
  it('decodes a custom link token', () => {
    const token = b64url({
      appAppleId: 6831375094, bundleId: 'ie.garix.app', tokenCreationDate: 1763290000000,
      externalPurchaseId: 'abc-123', tokenType: 'SERVICES', tokenExpirationDate: 1794826000000,
    });
    expect(decodeAppleToken(token)).toMatchObject({ externalPurchaseId: 'abc-123', tokenType: 'SERVICES', bundleId: 'ie.garix.app' });
  });

  it('decodes padded standard base64 too, and rejects junk', () => {
    const token = Buffer.from(JSON.stringify({ externalPurchaseId: 'SANDBOX_x' })).toString('base64');
    expect(decodeAppleToken(token)?.externalPurchaseId).toBe('SANDBOX_x');
    expect(decodeAppleToken('not a token')).toBeNull();
    expect(decodeAppleToken(b64url({ foo: 1 }))).toBeNull();
  });

  it('routes sandbox tokens to the sandbox', () => {
    expect(appleEnvironment('SANDBOX_00000000-0000')).toBe('sandbox');
    expect(appleEnvironment('2924c319-5205')).toBe('production');
  });
});

describe('Apple external purchase report', () => {
  const credits = { id: 'tx-1', kind: 'purchase' as const, product: 'credits' as const, amountCents: 2000, taxCents: 0, currency: 'eur', occurredAt: '2026-11-16T10:00:00.000Z' };

  it('reports a credit pack as a one-time buy in milli-units', () => {
    expect(appleLineItem(credits)).toEqual({
      lineItemId: 'tx-1',
      creationDate: Date.parse('2026-11-16T10:00:00.000Z'),
      eventType: 'BUY',
      quantity: 1,
      productType: 'ONE_TIME_BUY',
      productIdentifier: 'ie.garix.credits',
      pricingCurrency: 'EUR',
      reportingCurrency: 'EUR',
      amountTaxInclusive: 20000,
      amountTaxExclusive: 20000,
      taxAmount: 0,
      netAmountTaxExclusive: 20000,
      taxCountry: 'IRL',
    });
  });

  it('keeps inclusive = exclusive + tax when there is tax', () => {
    const item = appleLineItem({ ...credits, amountCents: 1230, taxCents: 230 });
    expect(item.amountTaxInclusive).toBe((item.amountTaxExclusive as number) + (item.taxAmount as number));
    expect(item.netAmountTaxExclusive).toBe(10000);
  });

  it('reports the first Pro payment as a subscription start', () => {
    const item = appleLineItem({
      ...credits, id: 'tx-2', product: 'pro', amountCents: 4900,
      periodStart: '2026-11-16T10:00:00.000Z', periodEnd: '2026-12-16T10:00:00.000Z',
    });
    expect(item).toMatchObject({
      productType: 'SUBSCRIPTION',
      productIdentifier: 'ie.garix.pro.monthly',
      subscriptionEvent: 'SUBSCRIPTION_START',
      subscriptionStartDate: Date.parse('2026-11-16T10:00:00.000Z'),
      subscriptionEndDate: Date.parse('2026-12-16T10:00:00.000Z'),
      subscriptionDaysOfPaidService: 0,
      amountTaxInclusive: 49000,
    });
    expect(item).not.toHaveProperty('referenceLineItemId');
  });

  it('reports a renewal against the subscription start with days already paid', () => {
    const item = appleLineItem({
      ...credits, id: 'tx-3', kind: 'renewal', product: 'pro', amountCents: 4900,
      occurredAt: '2026-12-16T10:00:00.000Z', initialLineItemId: 'tx-2', daysOfPaidService: 30,
    });
    expect(item).toMatchObject({ subscriptionEvent: 'RENEWAL', referenceLineItemId: 'tx-2', subscriptionDaysOfPaidService: 30 });
    // No period from Stripe: one calendar month from the payment.
    expect(item.subscriptionEndDate).toBe(Date.parse('2027-01-16T10:00:00.000Z'));
  });

  it('refuses a renewal without its subscription start', () => {
    expect(() => appleLineItem({ ...credits, kind: 'renewal', product: 'pro' })).toThrow('RENEWAL_WITHOUT_INITIAL_LINE_ITEM');
  });

  it('builds report bodies for each status', () => {
    expect(appleReportBody('req-1', 'epid', 'NO_LINE_ITEM')).toEqual({ requestIdentifier: 'req-1', externalPurchaseId: 'epid', status: 'NO_LINE_ITEM' });
    expect(appleReportBody('req-2', 'epid', 'UNRECOGNIZED_TOKEN')).not.toHaveProperty('lineItems');
    const withItems = appleReportBody('req-3', 'epid', 'LINE_ITEM', [credits]);
    expect(withItems.lineItems).toHaveLength(1);
    expect(() => appleReportBody('req-4', 'epid', 'LINE_ITEM', [])).toThrow();
  });

  it('counts whole days in a period', () => {
    expect(periodDays('2026-11-16T10:00:00Z', '2026-12-16T10:00:00Z')).toBe(30);
  });
});

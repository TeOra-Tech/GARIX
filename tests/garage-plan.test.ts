import { describe, expect, it } from 'vitest';
import {
  BASIC_DAILY_QUOTE_LIMIT,
  PRO_PRICE_EUR,
  garagePlanIsPro,
} from '@/lib/garage-plan/queries';

describe('garagePlanIsPro', () => {
  it('is true only for active/trialing subscriptions', () => {
    expect(garagePlanIsPro({ status: 'active' } as never)).toBe(true);
    expect(garagePlanIsPro({ status: 'trialing' } as never)).toBe(true);
    expect(garagePlanIsPro({ status: 'past_due' } as never)).toBe(false);
    expect(garagePlanIsPro({ status: 'canceled' } as never)).toBe(false);
    expect(garagePlanIsPro(null)).toBe(false);
    expect(garagePlanIsPro(undefined)).toBe(false);
  });
});

describe('plan constants', () => {
  it('Pro is €49/month', () => {
    expect(PRO_PRICE_EUR).toBe(49);
  });
  it('Basic is capped at 3 quotes/day', () => {
    expect(BASIC_DAILY_QUOTE_LIMIT).toBe(3);
  });
});

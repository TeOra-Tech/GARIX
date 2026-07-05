/**
 * Credit pricing — read from `system_settings` so admins can retune
 * without a deploy. These are the launch defaults (1 credit = €1).
 */
export const CREDIT_DEFAULTS = {
  submitQuote: 2,
  priorityQuote: 5,
  featuredListingPerDay: 10,
  lowBalanceThreshold: 10,
} as const;

export const CREDIT_PACKS = [
  { credits: 20, priceEur: 20 },
  { credits: 50, priceEur: 50 },
  { credits: 100, priceEur: 100 },
  { credits: 500, priceEur: 500 },
] as const;

'use client';

/**
 * GA4 event helper. No-ops when gtag hasn't loaded (no measurement ID,
 * ad blockers, consent) — analytics must never break a flow.
 * Roadmap events: request_created, quote_submitted, quote_accepted,
 * credits_purchased.
 *
 * NOTE: the enable/disable gate lives in components/analytics.tsx (a server
 * component) — it must NOT be imported from here. Values exported from a
 * 'use client' module become client-reference proxies when read on the
 * server, which silently renders a broken <Script> tag.
 */
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export function track(event: string, params?: Record<string, string | number | boolean>) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  window.gtag('event', event, params ?? {});
}

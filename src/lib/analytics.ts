'use client';

/**
 * GA4 event helper. No-ops when the measurement ID is absent or gtag hasn't
 * loaded (ad blockers, consent) — analytics must never break a flow.
 * Roadmap events: request_created, quote_submitted, quote_accepted,
 * credits_purchased.
 */
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
export const gaEnabled = Boolean(GA_ID && /^G-[A-Z0-9]{6,}$/.test(GA_ID) && GA_ID !== 'G-XXXXXXX');

export function track(event: string, params?: Record<string, string | number | boolean>) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  window.gtag('event', event, params ?? {});
}

import Script from 'next/script';

// Server component. Reads the env var directly — NEXT_PUBLIC_* is inlined at
// build for both server and client, so no client-module import is needed (and
// importing the gate from a 'use client' module would break it — see
// lib/analytics.ts).
const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const gaEnabled = Boolean(GA_ID && /^G-[A-Z0-9]{6,}$/.test(GA_ID) && GA_ID !== 'G-XXXXXXX');

/** GA4 loader — renders nothing unless a real measurement ID is configured. */
export function Analytics() {
  if (!gaEnabled) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}', { anonymize_ip: true });`}
      </Script>
    </>
  );
}

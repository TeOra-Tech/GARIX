import Script from 'next/script';
import { GA_ID, gaEnabled } from '@/lib/analytics';

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

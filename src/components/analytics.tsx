import { CookieConsent } from '@/components/consent/cookie-consent';
import { GA_ID, gaEnabled } from '@/lib/analytics-config';

/**
 * GA4 entry point — renders nothing unless a real measurement ID is configured.
 * When it is, the consent banner decides whether gtag ever loads.
 */
export function Analytics() {
  if (!gaEnabled) return null;
  return <CookieConsent gaId={GA_ID} />;
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import {
  type Consent,
  OPEN_COOKIE_SETTINGS,
  clearAnalyticsCookies,
  openCookieSettings,
  readConsent,
  writeConsent,
} from '@/lib/consent';

/**
 * Consent banner + GA4 loader. Analytics scripts are only injected after the
 * visitor accepts; "Reject" and "Accept" carry equal weight, nothing is
 * pre-selected, and the choice can be changed from "Cookie settings".
 */
export function CookieConsent({ gaId }: { gaId: string }) {
  const [consent, setConsent] = useState<Consent | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const saved = readConsent();
    setConsent(saved);
    setOpen(saved === null);
    const reopen = () => setOpen(true);
    window.addEventListener(OPEN_COOKIE_SETTINGS, reopen);
    return () => window.removeEventListener(OPEN_COOKIE_SETTINGS, reopen);
  }, []);

  function choose(value: Consent) {
    const withdrawn = consent === 'granted' && value === 'denied';
    writeConsent(value);
    setConsent(value);
    setOpen(false);
    if (withdrawn) {
      // gtag can't be unloaded from a running page — stop it writing, clear its
      // cookies and reload.
      (window as unknown as Record<string, boolean>)[`ga-disable-${gaId}`] = true;
      clearAnalyticsCookies();
      window.location.reload();
    }
  }

  return (
    <>
      {consent === 'granted' && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
          <Script id="ga4-init" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${gaId}', { anonymize_ip: true });`}
          </Script>
        </>
      )}

      {open && (
        <section
          role="dialog"
          aria-labelledby="cookie-consent-title"
          aria-describedby="cookie-consent-body"
          className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-white shadow-lg"
        >
          <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <h2 id="cookie-consent-title" className="font-semibold text-navy">
                Cookies on Garix
              </h2>
              <p id="cookie-consent-body" className="mt-1 text-sm text-charcoal/70">
                We use essential cookies to keep you signed in. With your permission, we&apos;d also
                like to use Google Analytics to understand how Garix is used. You can change your
                choice at any time.{' '}
                <Link href="/legal/privacy#cookies" className="font-medium text-navy underline underline-offset-2">
                  Read more about cookies
                </Link>
              </p>
            </div>
            <div className="flex shrink-0 gap-3">
              <button type="button" onClick={() => choose('denied')} className="btn-primary !px-5 !py-2.5 text-sm">
                Reject analytics
              </button>
              <button type="button" onClick={() => choose('granted')} className="btn-primary !px-5 !py-2.5 text-sm">
                Accept analytics
              </button>
            </div>
          </div>
        </section>
      )}
    </>
  );
}

/** Footer link that re-opens the consent banner. */
export function CookieSettingsButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      className={className}
      onClick={openCookieSettings}
    >
      Cookie settings
    </button>
  );
}

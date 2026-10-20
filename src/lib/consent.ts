'use client';

/**
 * Cookie-consent record (ePrivacy Regulations 2011 / DPC guidance).
 * The record itself is strictly necessary; analytics only loads once the
 * visitor has chosen "granted". Choices expire after 6 months so we ask again.
 */
export type Consent = 'granted' | 'denied';

const COOKIE = 'garix_consent';
const MAX_AGE_S = 60 * 60 * 24 * 182;
export const OPEN_COOKIE_SETTINGS = 'garix:cookie-settings';

export function readConsent(): Consent | null {
  const match = document.cookie.match(/(?:^|;\s*)garix_consent=(granted|denied)/);
  return (match?.[1] as Consent | undefined) ?? null;
}

export function writeConsent(value: Consent) {
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${COOKIE}=${value}; Max-Age=${MAX_AGE_S}; Path=/; SameSite=Lax${secure}`;
}

/** Removes Google Analytics cookies after consent is withdrawn. */
export function clearAnalyticsCookies() {
  const names = document.cookie
    .split(';')
    .map((c) => c.trim().split('=')[0])
    .filter((n) => n === '_ga' || n.startsWith('_ga_') || n === '_gid');
  const host = location.hostname;
  const domains = ['', host, `.${host.replace(/^www\./, '')}`];
  for (const name of names) {
    for (const d of domains) {
      document.cookie = `${name}=; Max-Age=0; Path=/${d ? `; Domain=${d}` : ''}`;
    }
  }
}

/** Re-opens the consent banner (footer "Cookie settings" link). */
export function openCookieSettings() {
  window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS));
}

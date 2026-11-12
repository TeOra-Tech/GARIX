// Reports Android app purchases (Google Play external offers programme) to the
// Google Play Developer API: externaltransactions.createexternaltransaction.
// Google requires each purchase to be reported within 24 hours.
//
// Secrets: GOOGLE_PLAY_SERVICE_ACCOUNT_JSON (the service account key JSON; the account
// needs Play Console access to the app's financial data/orders), GOOGLE_PLAY_PACKAGE_NAME.

const SCOPE = 'https://www.googleapis.com/auth/androidpublisher';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

type ServiceAccount = { client_email: string; private_key: string };

const b64url = (data: ArrayBuffer | Uint8Array | string) => {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data);
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

async function accessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(JSON.stringify({ iss: sa.client_email, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 }));
  const pem = sa.private_key.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${header}.${claims}`));
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${header}.${claims}.${b64url(sig)}` }),
  });
  if (!res.ok) throw new Error(`GOOGLE_AUTH_${res.status}`);
  return ((await res.json()) as { access_token: string }).access_token;
}

import { externalTransactionBody, type GoogleReport } from './google-play-body.ts';

export type { GoogleReport };

export function googlePlayConfigured(): boolean {
  return !!Deno.env.get('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON') && !!Deno.env.get('GOOGLE_PLAY_PACKAGE_NAME');
}

export async function reportExternalTransaction(r: GoogleReport): Promise<void> {
  const sa = JSON.parse(Deno.env.get('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON')!) as ServiceAccount;
  const pkg = Deno.env.get('GOOGLE_PLAY_PACKAGE_NAME')!;
  const token = await accessToken(sa);
  const url =
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(pkg)}` +
    `/externalTransactions?externalTransactionId=${encodeURIComponent(r.externalTransactionId)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(externalTransactionBody(r)),
  });
  // 409: already reported (a retry after a lost response) — treat as done.
  if (!res.ok && res.status !== 409) {
    const detail = await res.text().catch(() => '');
    throw new Error(`GOOGLE_REPORT_${res.status}: ${detail.slice(0, 300)}`);
  }
}

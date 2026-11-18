// Sends reports to Apple's External Purchase Server API (iOS app purchases made through
// the ExternalPurchaseCustomLink link-out). Auth: an ES256 JWT signed with an App Store
// Connect In-App Purchase key (aud appstoreconnect-v1, bid = bundle id), new per request.
//
// Secrets: APPLE_IAP_KEY_P8 (the .p8 file contents), APPLE_IAP_KEY_ID, APPLE_ISSUER_ID,
// APPLE_BUNDLE_ID (ie.garix.app — the iOS bundle id, not the Android package).

const URLS = {
  production: 'https://api.storekit.apple.com/externalPurchase/v1/reports',
  sandbox: 'https://api.storekit-sandbox.apple.com/externalPurchase/v1/reports',
};

const b64url = (data: ArrayBuffer | Uint8Array | string) => {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data);
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

export function appleReportingConfigured(): boolean {
  return ['APPLE_IAP_KEY_P8', 'APPLE_IAP_KEY_ID', 'APPLE_ISSUER_ID'].every((k) => !!Deno.env.get(k));
}

export const appleBundleId = () => Deno.env.get('APPLE_BUNDLE_ID') ?? 'ie.garix.app';

async function appleJwt(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'ES256', kid: Deno.env.get('APPLE_IAP_KEY_ID')!, typ: 'JWT' }));
  const claims = b64url(JSON.stringify({ iss: Deno.env.get('APPLE_ISSUER_ID')!, iat: now, exp: now + 15 * 60, aud: 'appstoreconnect-v1', bid: appleBundleId() }));
  const pem = Deno.env.get('APPLE_IAP_KEY_P8')!.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  // WebCrypto returns the raw r||s signature, which is the JWS ES256 format.
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(`${header}.${claims}`));
  return `${header}.${claims}.${b64url(sig)}`;
}

export type AppleSendResult = { ok: boolean; status: number; response: string };

export async function sendAppleReport(environment: 'production' | 'sandbox', body: Record<string, unknown>): Promise<AppleSendResult> {
  const res = await fetch(URLS[environment], {
    method: 'PUT',
    headers: { Authorization: `Bearer ${await appleJwt()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const response = (await res.text().catch(() => '')).slice(0, 2000);
  return { ok: res.ok, status: res.status, response };
}

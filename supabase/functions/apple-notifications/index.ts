// App Store Server Notifications V2 endpoint (set as the production and sandbox URL in
// App Store Connect → App Information → App Store Server Notifications).
//
// Garix sells nothing through Apple's in-app purchase, so the only notification we act on
// is EXTERNAL_PURCHASE_TOKEN / UNREPORTED: Apple's reminder that a custom link token
// hasn't been reported. We report it (with its payments, NO_LINE_ITEM, or
// UNRECOGNIZED_TOKEN if we never received it).
//
// Deploy with --no-verify-jwt (Apple doesn't send a Supabase token). The JWS signature
// isn't verified: the only effect of a notification is a report to Apple about the
// token id it names, which Apple rejects for ids it didn't issue, and no money or
// account data changes here.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { reportUnreportedToken } from '../_shared/apple-reporting.ts';
import { appleBundleId } from '../_shared/apple-external-purchase.ts';

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

type NotificationPayload = {
  notificationType?: string;
  subtype?: string;
  notificationUUID?: string;
  externalPurchaseToken?: { externalPurchaseId?: string; bundleId?: string; appAppleId?: number };
};

function decodeJwsPayload(jws: string): NotificationPayload | null {
  try {
    const part = jws.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(part + '='.repeat((4 - (part.length % 4)) % 4));
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
  } catch {
    return null;
  }
}

const ok = (body: Record<string, unknown>) => new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const { signedPayload } = (await req.json().catch(() => ({}))) as { signedPayload?: string };
  const payload = typeof signedPayload === 'string' ? decodeJwsPayload(signedPayload) : null;
  if (!payload) return new Response('Bad request', { status: 400 });

  // Acknowledge everything else (TEST notifications, other types) so Apple stops retrying.
  if (payload.notificationType !== 'EXTERNAL_PURCHASE_TOKEN' || payload.subtype !== 'UNREPORTED') {
    return ok({ ignored: payload.notificationType ?? null });
  }
  const token = payload.externalPurchaseToken;
  if (!token?.externalPurchaseId) return ok({ ignored: 'no_token' });
  if (token.bundleId && token.bundleId !== appleBundleId()) return ok({ ignored: 'other_bundle' });

  const outcome = await reportUnreportedToken(admin, token.externalPurchaseId);
  // A non-2xx makes Apple retry the notification later, which is what we want on errors.
  if (outcome === 'error') return new Response(JSON.stringify({ outcome }), { status: 500 });
  return ok({ outcome });
});

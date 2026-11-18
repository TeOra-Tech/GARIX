// Store reporting for purchases started in the mobile app. Meant to run on a schedule
// (pg_cron + pg_net) with the service-role key; nothing else may call it.
//   * Android: retries Google Play reports that failed (24-hour deadline).
//   * iOS: sends due Apple External Purchase Server API reports (see _shared/apple-reporting.ts).
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { reportToGoogle } from '../_shared/app-purchases.ts';
import { reportDueAppleTokens } from '../_shared/apple-reporting.ts';

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

async function retryGoogle() {
  // Skip rows from the last few minutes: the webhook is still handling those.
  const cutoff = new Date(Date.now() - 5 * 60_000).toISOString();
  const { data: pending, error } = await admin
    .from('app_purchase_transactions')
    .select('id, app_purchase_links!inner(platform)')
    .is('google_reported_at', null)
    .eq('app_purchase_links.platform', 'android')
    .lt('created_at', cutoff)
    .order('created_at')
    .limit(100);
  if (error) throw new Error(error.message);
  let reported = 0;
  for (const tx of pending ?? []) if (await reportToGoogle(admin, tx.id)) reported++;
  return { pending: pending?.length ?? 0, reported };
}

Deno.serve(async (req) => {
  const auth = req.headers.get('authorization') ?? '';
  if (auth !== `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`) {
    return new Response('Forbidden', { status: 403 });
  }
  try {
    const google = await retryGoogle();
    const apple = await reportDueAppleTokens(admin);
    return new Response(JSON.stringify({ google, apple }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500 });
  }
});

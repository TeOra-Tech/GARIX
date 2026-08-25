import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

/**
 * Service-role Supabase client. **Server-only** — never import this into a
 * client component or expose the key. Bypasses RLS; use for money/billing
 * writes (fleet_subscriptions) that have no client write policy.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase service-role env vars are missing');
  return createClient<Database>(url, key, { auth: { persistSession: false } });
}

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient, type Session } from '@supabase/supabase-js';
import type { BrowserContext } from '@playwright/test';

const env = readFileSync(join(process.cwd(), '.env.local'), 'utf8');
const get = (k: string): string => {
  const m = env.match(new RegExp(`^${k}=(.+)$`, 'm'));
  if (!m) throw new Error(`${k} missing from .env.local`);
  return m[1].trim().replace(/\s+#.*$/, '');
};

export const SUPABASE_URL = get('NEXT_PUBLIC_SUPABASE_URL');
const ANON = get('NEXT_PUBLIC_SUPABASE_ANON_KEY');
const SERVICE = get('SUPABASE_SERVICE_ROLE_KEY');
const PROJECT_REF = new URL(SUPABASE_URL).hostname.split('.')[0];

export const admin = createClient(SUPABASE_URL, SERVICE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export type TestUser = { id: string; email: string; session: Session };

/** Creates a confirmed user and returns a real session (OTP verified server-side). */
export async function createTestUser(email: string, role: string, fullName: string): Promise<TestUser> {
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: false,
    user_metadata: { full_name: fullName, role },
  });
  if (error) throw new Error(error.message);
  const { data: link, error: lErr } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  if (lErr || !link) throw new Error(lErr?.message ?? 'generateLink failed');
  const anon = createClient(SUPABASE_URL, ANON, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data, error: vErr } = await anon.auth.verifyOtp({
    email,
    token: link.properties.email_otp,
    type: 'email',
  });
  if (vErr || !data.session) throw new Error(vErr?.message ?? 'no session');
  return { id: created.user!.id, email, session: data.session };
}

/**
 * Injects the session as the @supabase/ssr auth cookie so the browser context
 * is signed in — no email round-trip, middleware and RLS behave exactly as in
 * production.
 */
export async function signIn(context: BrowserContext, user: TestUser): Promise<void> {
  const value = 'base64-' + Buffer.from(JSON.stringify(user.session)).toString('base64url');
  await context.addCookies([
    {
      name: `sb-${PROJECT_REF}-auth-token`,
      value,
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    },
  ]);
}

export async function seedActiveGarage(ownerId: string, stamp: number) {
  const { data: garage, error } = await admin
    .from('garages')
    .insert({
      owner_id: ownerId,
      name: `E2E Garage ${stamp}`,
      slug: `e2e-garage-${stamp}`,
      contact_person: 'Pat Murphy',
      phone: '045123456',
      status: 'active',
      offers_collection: true,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  await admin.from('garage_locations').insert({
    garage_id: garage.id,
    line1: 'Unit 4, Business Park',
    town: 'Naas',
    county: 'Kildare',
    location: 'SRID=4326;POINT(-6.6598 53.2191)',
    is_primary: true,
  });
  const { data: cat } = await admin.from('repair_categories').select('id').is('parent_id', null).limit(1);
  await admin.from('garage_services').insert({ garage_id: garage.id, repair_category_id: cat![0].id });
  await admin.rpc('add_credits', {
    p_garage_id: garage.id,
    p_amount: 10,
    p_type: 'admin_adjustment',
    p_description: 'E2E seed',
  });
  return garage;
}

export async function cleanup(userIds: string[], garageIds: string[]) {
  for (const g of garageIds) await admin.from('garages').delete().eq('id', g);
  for (const u of userIds) await admin.auth.admin.deleteUser(u);
}

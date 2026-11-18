import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { USER_KEYED_BUCKETS, type DeletionBlocker } from '@/lib/account/deletion';
import { listFiles } from '@/lib/account/storage';
import type { Database } from '@/types/database';

const bodySchema = z.object({ confirmEmail: z.string().trim().email() });

/**
 * Permanently deletes the signed-in user's account (GDPR erasure; app-store
 * in-app deletion). Blockers are checked first, then the caller's marketplace
 * data goes via delete_my_account_data(), then storage files under
 * {user_id}/, then the auth user, which cascades the profile. Every step is
 * safe to repeat, so a failed attempt can simply be retried.
 *
 * The website authenticates with its session cookie; the mobile app sends its
 * access token as `Authorization: Bearer …` instead. Either way RLS applies.
 */
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });

  const bearer = request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
  const supabase = bearer
    ? createSupabaseClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        global: { headers: { Authorization: `Bearer ${bearer}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : await createClient();
  const {
    data: { user },
  } = bearer ? await supabase.auth.getUser(bearer) : await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  if (parsed.data.confirmEmail.toLowerCase() !== (user.email ?? '').toLowerCase()) {
    return NextResponse.json({ error: 'EMAIL_MISMATCH' }, { status: 400 });
  }

  const { data: blockers, error: blockersError } = await supabase.rpc('account_deletion_blockers');
  if (blockersError) return NextResponse.json({ error: 'DELETE_FAILED' }, { status: 500 });
  if (blockers && blockers.length > 0) {
    return NextResponse.json({ error: 'BLOCKED', blockers: blockers as DeletionBlocker[] }, { status: 409 });
  }

  const admin = createAdminClient();
  try {
    const { error: dataError } = await supabase.rpc('delete_my_account_data');
    if (dataError) throw dataError;

    for (const bucket of USER_KEYED_BUCKETS) {
      const paths = await listFiles(admin.storage, bucket, user.id);
      for (let i = 0; i < paths.length; i += 100) {
        const { error } = await admin.storage.from(bucket).remove(paths.slice(i, i + 100));
        if (error) throw error;
      }
    }

    const { error: authError } = await admin.auth.admin.deleteUser(user.id);
    if (authError) throw authError;
  } catch (e) {
    console.error('account deletion failed', { userId: user.id, message: (e as Error).message });
    return NextResponse.json({ error: 'DELETE_FAILED' }, { status: 500 });
  }

  // The app clears its own stored session; only the cookie session needs signing out here.
  if (!bearer) await supabase.auth.signOut().catch(() => undefined);
  return NextResponse.json({ ok: true });
}

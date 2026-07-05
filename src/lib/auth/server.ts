import { createClient } from '@/lib/supabase/server';
import type { User } from '@supabase/supabase-js';
import type { UserProfile } from './roles';

/**
 * Authenticated user + their profile row, or null when signed out.
 * Uses getUser() (verified against the auth server), not the raw session.
 */
export async function getSessionProfile(): Promise<{ user: User; profile: UserProfile } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  if (!profile) return null;

  return { user, profile };
}

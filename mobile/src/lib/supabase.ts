import 'expo-sqlite/localStorage/install';
import { AppState } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/database';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anonKey) {
  throw new Error('EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY are missing — copy .env.example to .env.local');
}

/** Anon-key client: RLS is the authorization layer, exactly as on the web. */
export const supabase = createClient<Database>(url, anonKey, {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Only refresh tokens while the app is in the foreground (Expo's Supabase guide).
AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://garix.ie';

export async function currentUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  return user.id;
}

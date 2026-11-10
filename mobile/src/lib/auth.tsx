import { createContext, useContext, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';
import type { Tables } from '@/shared/database';

export type Profile = Pick<Tables<'user_profiles'>, 'id' | 'full_name' | 'email' | 'role' | 'account_type' | 'mobile_number'>;

type AuthState = {
  /** undefined while the stored session is still loading. */
  session: Session | null | undefined;
  profile: Profile | null | undefined;
  refreshProfile: () => Promise<unknown>;
};

const AuthContext = createContext<AuthState>({ session: undefined, profile: undefined, refreshProfile: async () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const qc = useQueryClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      // Never show one user's cached data to the next.
      if (!next) qc.clear();
    });
    return () => sub.subscription.unsubscribe();
  }, [qc]);

  const userId = session?.user.id;
  const profile = useQuery({
    queryKey: ['user_profiles', 'me', userId],
    enabled: !!userId,
    queryFn: async (): Promise<Profile> => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, full_name, email, role, account_type, mobile_number')
        .eq('id', userId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const value: AuthState = {
    session,
    profile: !session ? (session === undefined ? undefined : null) : profile.data ?? (profile.isError ? null : undefined),
    refreshProfile: profile.refetch,
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

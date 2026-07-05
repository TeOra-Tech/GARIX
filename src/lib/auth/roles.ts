import type { Database } from '@/types/database';

export type UserRole = Database['public']['Enums']['user_role'];
export type UserProfile = Database['public']['Tables']['user_profiles']['Row'];

/** Where each role lands after signing in. */
export function roleHome(role: UserRole | null | undefined): '/admin' | '/dashboard' {
  return role === 'admin' ? '/admin' : '/dashboard';
}

/** Only allow same-origin relative paths as post-login destinations. */
export function safeNext(next: string | null | undefined): string | null {
  if (!next) return null;
  return next.startsWith('/') && !next.startsWith('//') ? next : null;
}

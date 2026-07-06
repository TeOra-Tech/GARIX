'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/types/database';

/** Calls /api/admin with the current session's access token. */
async function adminApi(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const {
    data: { session },
  } = await createClient().auth.getSession();
  if (!session) throw new Error('Not signed in');
  const res = await fetch('/api/admin', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
  });
  const payload = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new Error((payload.error as string) ?? 'ADMIN_API_FAILED');
  return payload;
}

// ---------- overview ----------

export function usePlatformStats() {
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      const supabase = createClient();
      const head = { count: 'exact' as const, head: true };
      const [users, garages, pending, requests, quotes, payments] = await Promise.all([
        supabase.from('user_profiles').select('id', head),
        supabase.from('garages').select('id', head).eq('status', 'active'),
        supabase.from('garages').select('id', head).in('status', ['pending_verification', 'pending_approval']),
        supabase.from('service_requests').select('id', head),
        supabase.from('quotes').select('id', head),
        supabase.from('payments').select('amount_eur').eq('status', 'succeeded'),
      ]);
      return {
        users: users.count ?? 0,
        activeGarages: garages.count ?? 0,
        pendingGarages: pending.count ?? 0,
        requests: requests.count ?? 0,
        quotes: quotes.count ?? 0,
        revenueEur: (payments.data ?? []).reduce((s, p) => s + Number(p.amount_eur), 0),
      };
    },
  });
}

// ---------- garages ----------

export type AdminGarage = Tables<'garages'> & {
  user_profiles: { full_name: string; email: string } | null;
  credit_wallets: { balance: number } | null;
};

export function useAdminGarages(statusFilter: string | null) {
  return useQuery({
    queryKey: ['admin', 'garages', statusFilter],
    queryFn: async (): Promise<AdminGarage[]> => {
      let q = createClient()
        .from('garages')
        .select('*, user_profiles!garages_owner_id_fkey(full_name, email), credit_wallets(balance)')
        .order('created_at', { ascending: false })
        .limit(100);
      if (statusFilter) q = q.eq('status', statusFilter as Tables<'garages'>['status']);
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as AdminGarage[];
    },
  });
}

export function useGarageStatusAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { garageId: string; status: 'active' | 'rejected' | 'suspended' }) =>
      adminApi({ action: 'garage_status', ...input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin'] }),
  });
}

export function useAdjustCredits() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { garageId: string; amount: number; reason: string }) =>
      adminApi({ action: 'adjust_credits', ...input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin'] }),
  });
}

// ---------- users ----------

export function useAdminUsers(search: string) {
  return useQuery({
    queryKey: ['admin', 'users', search],
    queryFn: async (): Promise<Tables<'user_profiles'>[]> => {
      let q = createClient()
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (search.trim()) q = q.or(`full_name.ilike.%${search.trim()}%,email.ilike.%${search.trim()}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useSetUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: Tables<'user_profiles'>['role'] }) => {
      const { error } = await createClient().from('user_profiles').update({ role }).eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

// ---------- reviews ----------

export type AdminReview = Tables<'reviews'> & {
  garages: { name: string } | null;
  user_profiles: { full_name: string } | null;
};

export function useAdminReviews() {
  return useQuery({
    queryKey: ['admin', 'reviews'],
    queryFn: async (): Promise<AdminReview[]> => {
      const { data, error } = await createClient()
        .from('reviews')
        .select('*, garages(name), user_profiles!reviews_customer_id_fkey(full_name)')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as unknown as AdminReview[];
    },
  });
}

export function useSetReviewHidden() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ reviewId, hidden }: { reviewId: string; hidden: boolean }) => {
      const { error } = await createClient()
        .from('reviews')
        .update({ is_hidden: hidden, is_moderated: true })
        .eq('id', reviewId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'reviews'] }),
  });
}

// ---------- disputes ----------

export type AdminDispute = Tables<'disputes'> & {
  service_requests: { title: string } | null;
  opener: { full_name: string } | null;
};

export function useAdminDisputes() {
  return useQuery({
    queryKey: ['admin', 'disputes'],
    queryFn: async (): Promise<AdminDispute[]> => {
      const { data, error } = await createClient()
        .from('disputes')
        .select('*, service_requests(title), opener:user_profiles!disputes_opened_by_fkey(full_name)')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as unknown as AdminDispute[];
    },
  });
}

export function useResolveDispute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      disputeId,
      status,
      resolution,
    }: {
      disputeId: string;
      status: 'investigating' | 'resolved' | 'closed';
      resolution?: string;
    }) => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('disputes')
        .update({
          status,
          ...(status === 'resolved' || status === 'closed'
            ? { resolution: resolution ?? null, resolved_by: user?.id, resolved_at: new Date().toISOString() }
            : {}),
        })
        .eq('id', disputeId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'disputes'] }),
  });
}

// ---------- settings + audit ----------

export function useAdminSettings() {
  return useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: async (): Promise<Tables<'system_settings'>[]> => {
      const { data, error } = await createClient().from('system_settings').select('*').order('key');
      if (error) throw error;
      return data;
    },
  });
}

export function useSaveSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: unknown }) => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('system_settings')
        .update({ value: value as never, updated_by: user?.id, updated_at: new Date().toISOString() })
        .eq('key', key);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'settings'] }),
  });
}

export type AuditLog = Tables<'audit_logs'> & { actor: { full_name: string } | null };

export function useAuditLogs() {
  return useQuery({
    queryKey: ['admin', 'audit_logs'],
    queryFn: async (): Promise<AuditLog[]> => {
      const { data, error } = await createClient()
        .from('audit_logs')
        .select('*, actor:user_profiles!audit_logs_actor_id_fkey(full_name)')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as unknown as AuditLog[];
    },
  });
}

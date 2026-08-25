'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/types/database';

export type GarageSubscription = Tables<'garage_subscriptions'>;
export const PRO_PRICE_EUR = 49;
export const BASIC_DAILY_QUOTE_LIMIT = 3;

/** Whether the Basic/Pro plan model is switched on (system_settings flag). */
export function usePlansEnabled() {
  return useQuery({
    queryKey: ['system_settings', 'plans.enabled'],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<boolean> => {
      const { data } = await createClient()
        .from('system_settings')
        .select('value')
        .eq('key', 'plans.enabled')
        .maybeSingle();
      return Boolean((data?.value as { enabled?: boolean } | null)?.enabled);
    },
  });
}

export function useGarageSubscription(garageId: string) {
  return useQuery({
    queryKey: ['garage_subscription', garageId],
    queryFn: async (): Promise<GarageSubscription | null> => {
      const { data, error } = await createClient()
        .from('garage_subscriptions')
        .select('*')
        .eq('garage_id', garageId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function garagePlanIsPro(sub: GarageSubscription | null | undefined): boolean {
  return sub?.status === 'active' || sub?.status === 'trialing';
}

/** Quotes this garage has sent today (for the Basic daily-limit display). */
export function useGarageQuotesToday(garageId: string, enabled = true) {
  return useQuery({
    queryKey: ['garage_quotes_today', garageId],
    enabled,
    queryFn: async (): Promise<number> => {
      const { data, error } = await createClient().rpc('garage_quotes_today', { p_garage_id: garageId });
      if (error) throw error;
      return data ?? 0;
    },
  });
}

async function postJson(url: string, body: unknown): Promise<Record<string, unknown>> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new Error((data.error as string) || `Request failed (${res.status})`);
  return data;
}

export function useStartProCheckout(garageId: string) {
  return useMutation({
    mutationFn: async () => {
      const body = await postJson('/api/garage/plan/checkout', { garageId });
      if (typeof body.url === 'string') window.location.href = body.url;
      return body;
    },
  });
}

export function useOpenGaragePortal(garageId: string) {
  return useMutation({
    mutationFn: async () => {
      const body = await postJson('/api/garage/plan/portal', { garageId });
      if (typeof body.url === 'string') window.location.href = body.url;
      return body;
    },
  });
}

export function useReconcileGaragePlan(garageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => postJson('/api/garage/plan/reconcile', { garageId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['garage_subscription', garageId] }),
  });
}

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/types/database';

export type FleetSubscription = Tables<'fleet_subscriptions'>;
export const FLEET_PRICE_EUR = 5; // €5 / vehicle / month (mirrors system_settings)

/** account_type + role for the signed-in user, drives cap/billing UI. */
export function useMyAccount() {
  return useQuery({
    queryKey: ['user_profiles', 'account'],
    queryFn: async (): Promise<{ id: string; role: string; account_type: string } | null> => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, role, account_type')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useIsFleet() {
  const account = useMyAccount();
  return account.data?.account_type === 'fleet';
}

/** The fleet subscription row (RLS: own only). null until set up. */
export function useFleetSubscription(enabled = true) {
  return useQuery({
    queryKey: ['fleet_subscription'],
    enabled,
    queryFn: async (): Promise<FleetSubscription | null> => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase
        .from('fleet_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function fleetIsActive(sub: FleetSubscription | null | undefined): boolean {
  return sub?.status === 'active' || sub?.status === 'trialing';
}

async function postJson(url: string): Promise<Record<string, unknown>> {
  const res = await fetch(url, { method: 'POST' });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new Error((body.error as string) || `Request failed (${res.status})`);
  return body;
}

/** Start the fleet subscription checkout and redirect to Stripe. */
export function useStartFleetCheckout() {
  return useMutation({
    mutationFn: async () => {
      const body = await postJson('/api/fleet/checkout');
      if (typeof body.url === 'string') window.location.href = body.url;
      return body;
    },
  });
}

/** Open the Stripe billing portal (manage card / fix past-due / cancel). */
export function useOpenBillingPortal() {
  return useMutation({
    mutationFn: async () => {
      const body = await postJson('/api/fleet/portal');
      if (typeof body.url === 'string') window.location.href = body.url;
      return body;
    },
  });
}

/** Pull latest subscription state from Stripe into the DB. */
export function useReconcileFleet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => postJson('/api/fleet/reconcile'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fleet_subscription'] }),
  });
}

/** Fire-and-forget: keep the Stripe quantity in step with the vehicle count. */
export async function syncFleetQuantity(): Promise<void> {
  try {
    await fetch('/api/fleet/sync-quantity', { method: 'POST' });
  } catch {
    // non-blocking; reconcile / webhook will catch up
  }
}

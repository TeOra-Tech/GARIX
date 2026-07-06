'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/types/database';

export function useCreditPacks() {
  return useQuery({
    queryKey: ['credit_packs'],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<Tables<'credit_packs'>[]> => {
      const { data, error } = await createClient()
        .from('credit_packs')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')
        .order('credits');
      if (error) throw error;
      return data;
    },
  });
}

export function useTransactions(garageId: string | undefined) {
  return useQuery({
    queryKey: ['credit_transactions', garageId],
    enabled: !!garageId,
    queryFn: async (): Promise<Tables<'credit_transactions'>[]> => {
      const { data, error } = await createClient()
        .from('credit_transactions')
        .select('*')
        .eq('garage_id', garageId!)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });
}

/** Creates the Checkout session server-side, then sends the browser to Stripe. */
export function useStartCheckout() {
  return useMutation({
    mutationFn: async (payload: { garageId: string; creditPackId: string }) => {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = (await res.json().catch(() => null)) as { url?: string; error?: string } | null;
      if (!res.ok || !body?.url) throw new Error(body?.error ?? 'CHECKOUT_FAILED');
      window.location.assign(body.url);
    },
  });
}

export const TX_LABELS: Record<Tables<'credit_transactions'>['type'], string> = {
  purchase: 'Credit purchase',
  quote_fee: 'Quote submitted',
  priority_quote_fee: 'Priority quote submitted',
  featured_listing_fee: 'Featured listing',
  refund: 'Refund',
  admin_adjustment: 'Adjustment by Garix',
  bonus: 'Bonus credits',
};

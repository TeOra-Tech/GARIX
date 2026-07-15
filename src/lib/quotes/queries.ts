'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/types/database';
import { IRELAND_VAT, type VatRates } from '@/lib/vat';
import { CREDIT_DEFAULTS } from '@/lib/credits';
import type { QuoteData } from '@/lib/validation/quote';
import { quoteTotals } from '@/lib/validation/quote';

/** Current Irish VAT rates from the DB (UI preview only — the DB owns truth). */
export function useVatRates() {
  return useQuery({
    queryKey: ['vat_rates'],
    staleTime: Infinity,
    queryFn: async (): Promise<VatRates> => {
      const { data, error } = await createClient()
        .from('vat_rates')
        .select('code, rate')
        .is('valid_to', null);
      if (error) throw error;
      const find = (code: string) => data.find((r) => r.code === code)?.rate;
      return {
        parts: Number(find('IE_PARTS') ?? IRELAND_VAT.parts),
        labour: Number(find('IE_LABOUR') ?? IRELAND_VAT.labour),
      };
    },
  });
}

/** Credit price of a quote from system_settings (public keys are readable). */
export function useQuoteCosts() {
  return useQuery({
    queryKey: ['system_settings', 'quote_costs'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await createClient()
        .from('system_settings')
        .select('key, value')
        .in('key', ['credits.submit_quote', 'credits.priority_quote']);
      if (error) throw error;
      const cost = (key: string, fallback: number) => {
        const v = data.find((r) => r.key === key)?.value as { cost?: number } | null;
        return v?.cost ?? fallback;
      };
      return {
        standard: cost('credits.submit_quote', CREDIT_DEFAULTS.submitQuote),
        priority: cost('credits.priority_quote', CREDIT_DEFAULTS.priorityQuote),
      };
    },
  });
}

export function useWallet(garageId: string | undefined) {
  return useQuery({
    queryKey: ['credit_wallets', garageId],
    enabled: !!garageId,
    queryFn: async (): Promise<Tables<'credit_wallets'> | null> => {
      const { data, error } = await createClient()
        .from('credit_wallets')
        .select('*')
        .eq('garage_id', garageId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export type FeedRequest = Tables<'service_requests'> & {
  vehicles: {
    registration_number: string;
    year: number | null;
    make_text: string | null;
    model_text: string | null;
    fuel_type: string | null;
    vehicle_makes: { name: string } | null;
    vehicle_models: { name: string } | null;
  } | null;
  service_category: { name: string } | null;
  request_attachments: { id: string }[];
};

const FEED_SELECT =
  '*, vehicles(registration_number, year, make_text, model_text, fuel_type, vehicle_makes(name), vehicle_models(name)), ' +
  'service_category:repair_categories!service_requests_service_category_id_fkey(name), request_attachments(id)';

/** Open marketplace requests — RLS scopes this to owners of active garages. */
export function useOpenRequestsFeed(enabled: boolean) {
  return useQuery({
    queryKey: ['service_requests', 'feed'],
    enabled,
    queryFn: async (): Promise<FeedRequest[]> => {
      const { data, error } = await createClient()
        .from('service_requests')
        .select(FEED_SELECT)
        .in('status', ['open', 'quoted'])
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      // supabase-js's type parser cannot digest the aliased FK-hint embed;
      // the E2E covers the shape at runtime.
      return data as unknown as FeedRequest[];
    },
  });
}

export function useSingleFeedRequest(id: string, enabled: boolean) {
  return useQuery({
    queryKey: ['service_requests', 'feed', id],
    enabled,
    queryFn: async (): Promise<FeedRequest> => {
      const { data, error } = await createClient()
        .from('service_requests')
        .select(FEED_SELECT)
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as unknown as FeedRequest;
    },
  });
}

/** My garage's quotes keyed by request, to badge the feed. */
export function useMyGarageQuotes(garageId: string | undefined) {
  return useQuery({
    queryKey: ['quotes', 'garage', garageId],
    enabled: !!garageId,
    queryFn: async () => {
      const { data, error } = await createClient()
        .from('quotes')
        .select('*')
        .eq('garage_id', garageId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export type SubmitQuotePayload = {
  requestId: string;
  garageId: string;
  data: QuoteData;
};

export class SubmitQuoteError extends Error {
  constructor(
    public code: string,
    public status: number,
  ) {
    super(code);
  }
}

export function useSubmitQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ requestId, garageId, data }: SubmitQuotePayload) => {
      const totals = quoteTotals(data.items);
      const { data: result, error } = await createClient().functions.invoke('submit-quote', {
        body: {
          requestId,
          garageId,
          labourCost: totals.labour,
          partsCost: totals.parts,
          isPriority: data.isPriority,
          estimatedDurationHours: data.estimatedDurationHours,
          warrantyInfo: data.warrantyInfo || null,
          notes: data.notes || null,
          items: data.items.map((i) => ({
            item_type: i.itemType,
            description: i.description,
            quantity: i.quantity,
            unit_price: i.unitPrice,
          })),
        },
      });
      if (error) {
        if (error instanceof FunctionsHttpError) {
          const body = (await error.context.json().catch(() => null)) as { error?: string } | null;
          throw new SubmitQuoteError(body?.error ?? 'UNKNOWN', error.context.status);
        }
        throw error;
      }
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quotes'] });
      qc.invalidateQueries({ queryKey: ['service_requests'] });
      qc.invalidateQueries({ queryKey: ['credit_wallets'] });
    },
  });
}

export function submitErrorMessage(error: unknown, cost: number): string {
  if (error instanceof SubmitQuoteError) {
    switch (error.code) {
      case 'INSUFFICIENT_CREDITS':
        return `You need ${cost} credits to submit this quote — top up your wallet first.`;
      case 'REQUEST_NOT_OPEN':
        return 'This request is no longer open for quotes.';
      case 'GARAGE_NOT_ACTIVE':
        return 'Your garage must be verified before you can quote.';
      default:
        if (error.status === 409) return 'You have already quoted on this request.';
    }
  }
  return 'Could not submit the quote. Try again.';
}

// ---------- customer side ----------

export type QuoteWithGarage = Tables<'quotes'> & {
  garages: { name: string; slug: string; avg_rating: number; review_count: number } | null;
  quote_items: Tables<'quote_items'>[];
};

export function useRequestQuotes(requestId: string) {
  return useQuery({
    queryKey: ['quotes', 'request', requestId],
    queryFn: async (): Promise<QuoteWithGarage[]> => {
      const { data, error } = await createClient()
        .from('quotes')
        .select('*, garages(name, slug, avg_rating, review_count), quote_items(*)')
        .eq('request_id', requestId)
        .order('created_at');
      if (error) throw error;
      return data as QuoteWithGarage[];
    },
  });
}

export function useMyRequest(requestId: string) {
  return useQuery({
    queryKey: ['service_requests', 'mine', requestId],
    queryFn: async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in');
      // customer-side page: RLS also lets garages read open requests,
      // so pin the row to the signed-in customer
      const { data, error } = await supabase
        .from('service_requests')
        .select('*, vehicles(registration_number, make_text, model_text, vehicle_makes(name), vehicle_models(name))')
        .eq('id', requestId)
        .eq('customer_id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useAcceptQuote(requestId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (quoteId: string) => {
      const { error } = await createClient().rpc('accept_quote', { p_quote_id: quoteId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quotes', 'request', requestId] });
      qc.invalidateQueries({ queryKey: ['service_requests'] });
    },
  });
}

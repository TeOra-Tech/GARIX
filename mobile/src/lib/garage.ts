// Garage-owner side. Mirrors the web's src/lib/garages/portal.ts, src/lib/quotes/queries.ts,
// src/lib/reviews/queries.ts and src/lib/garage-plan/queries.ts.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { currentUserId, supabase } from './supabase';
import type { Tables } from '@/shared/database';
import { IRELAND_VAT, type VatRates } from '@/shared/vat';
import { CREDIT_DEFAULTS } from '@/shared/credits';
import { quoteTotals, type QuoteData } from '@/shared/validation/quote';

// ---------------------------------------------------------------- garages
export type OwnedGarage = Pick<Tables<'garages'>, 'id' | 'name' | 'slug' | 'status' | 'plan' | 'avg_rating' | 'review_count'>;

export function useMyGarages() {
  return useQuery({
    queryKey: ['garages', 'mine'],
    queryFn: async (): Promise<OwnedGarage[]> => {
      const { data, error } = await supabase
        .from('garages')
        .select('id, name, slug, status, plan, avg_rating, review_count')
        .eq('owner_id', await currentUserId())
        .order('created_at');
      if (error) throw error;
      return data;
    },
  });
}

export function usePlansEnabled() {
  return useQuery({
    queryKey: ['system_settings', 'plans.enabled'],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<boolean> => {
      const { data } = await supabase.rpc('plans_enabled');
      return Boolean(data);
    },
  });
}

export function useGarageSubscription(garageId: string | undefined) {
  return useQuery({
    queryKey: ['garage_subscription', garageId],
    enabled: !!garageId,
    queryFn: async () => {
      const { data, error } = await supabase.from('garage_subscriptions').select('*').eq('garage_id', garageId!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export const isProSubscription = (s: { status: string } | null | undefined) => s?.status === 'active' || s?.status === 'trialing';

export function useGarageQuotesToday(garageId: string | undefined) {
  return useQuery({
    queryKey: ['garage_quotes_today', garageId],
    enabled: !!garageId,
    queryFn: async (): Promise<number> => {
      const { data, error } = await supabase.rpc('garage_quotes_today', { p_garage_id: garageId! });
      if (error) throw error;
      return data ?? 0;
    },
  });
}

// ---------------------------------------------------------------- pricing
/** Current Irish VAT rates (UI preview only — the database computes the real totals). */
export function useVatRates() {
  return useQuery({
    queryKey: ['vat_rates'],
    staleTime: Infinity,
    queryFn: async (): Promise<VatRates> => {
      const { data, error } = await supabase.from('vat_rates').select('code, rate').is('valid_to', null);
      if (error) throw error;
      const find = (code: string) => data.find((r) => r.code === code)?.rate;
      return { parts: Number(find('IE_PARTS') ?? IRELAND_VAT.parts), labour: Number(find('IE_LABOUR') ?? IRELAND_VAT.labour) };
    },
  });
}

export function useQuoteCosts() {
  return useQuery({
    queryKey: ['system_settings', 'quote_costs'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('system_settings').select('key, value').in('key', ['credits.submit_quote', 'credits.priority_quote']);
      if (error) throw error;
      const cost = (key: string, fallback: number) => (data.find((r) => r.key === key)?.value as { cost?: number } | null)?.cost ?? fallback;
      return {
        standard: cost('credits.submit_quote', CREDIT_DEFAULTS.submitQuote),
        priority: cost('credits.priority_quote', CREDIT_DEFAULTS.priorityQuote),
      };
    },
  });
}

// ---------------------------------------------------------------- wallet
export function useWallet(garageId: string | undefined) {
  return useQuery({
    queryKey: ['credit_wallets', garageId],
    enabled: !!garageId,
    queryFn: async () => {
      const { data, error } = await supabase.from('credit_wallets').select('*').eq('garage_id', garageId!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useCreditLedger(garageId: string | undefined) {
  return useQuery({
    queryKey: ['credit_transactions', garageId],
    enabled: !!garageId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('credit_transactions')
        .select('id, type, amount, balance_after, description, created_at')
        .eq('garage_id', garageId!)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });
}

export const LEDGER_LABELS: Record<string, string> = {
  purchase: 'Credits bought',
  quote_fee: 'Quote sent',
  priority_quote_fee: 'Priority quote sent',
  featured_listing_fee: 'Featured listing',
  refund: 'Refund',
  admin_adjustment: 'Adjustment by Garix',
  bonus: 'Bonus credits',
};

// ---------------------------------------------------------------- request feed
export type FeedRequest = Tables<'service_requests'> & {
  vehicles: {
    registration_number: string; year: number | null; make_text: string | null; model_text: string | null; fuel_type: string | null;
    vehicle_makes: { name: string } | null; vehicle_models: { name: string } | null;
  } | null;
  service_category: { name: string } | null;
  request_attachments: { id: string }[];
};
const FEED_SELECT =
  '*, vehicles(registration_number, year, make_text, model_text, fuel_type, vehicle_makes(name), vehicle_models(name)), ' +
  'service_category:repair_categories!service_requests_service_category_id_fkey(name), request_attachments(id)';

/** Open marketplace requests — RLS limits this to owners of active garages. */
export function useRequestFeed(enabled: boolean) {
  return useQuery({
    queryKey: ['service_requests', 'feed'],
    enabled,
    queryFn: async (): Promise<FeedRequest[]> => {
      const { data, error } = await supabase
        .from('service_requests')
        .select(FEED_SELECT)
        .in('status', ['open', 'quoted'])
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as unknown as FeedRequest[];
    },
  });
}

export function useFeedRequest(id: string) {
  return useQuery({
    queryKey: ['service_requests', 'feed', id],
    queryFn: async (): Promise<FeedRequest> => {
      const { data, error } = await supabase.from('service_requests').select(FEED_SELECT).eq('id', id).single();
      if (error) throw error;
      return data as unknown as FeedRequest;
    },
  });
}

// ---------------------------------------------------------------- quotes
export type GarageQuote = Tables<'quotes'> & {
  service_requests: { title: string; status: string; completed_at: string | null; location_town: string | null; location_county: string | null } | null;
};

export function useGarageQuotes(garageId: string | undefined) {
  return useQuery({
    queryKey: ['quotes', 'garage', garageId],
    enabled: !!garageId,
    queryFn: async (): Promise<GarageQuote[]> => {
      const { data, error } = await supabase
        .from('quotes')
        .select('*, service_requests(title, status, completed_at, location_town, location_county)')
        .eq('garage_id', garageId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as GarageQuote[];
    },
  });
}

export class SubmitQuoteError extends Error {
  constructor(public code: string, public status: number) {
    super(code);
  }
}

/** Quotes go through the submit-quote Edge Function, which charges credits server-side. */
export function useSubmitQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ requestId, garageId, data }: { requestId: string; garageId: string; data: QuoteData }) => {
      const totals = quoteTotals(data.items);
      const { data: result, error } = await supabase.functions.invoke('submit-quote', {
        body: {
          requestId,
          garageId,
          labourCost: totals.labour,
          partsCost: totals.parts,
          isPriority: data.isPriority,
          estimatedDurationHours: data.estimatedDurationHours,
          earliestStartDate: data.earliestStartDate || null,
          warrantyInfo: data.warrantyInfo || null,
          notes: data.notes || null,
          items: data.items.map((i) => ({ item_type: i.itemType, description: i.description, quantity: i.quantity, unit_price: i.unitPrice })),
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
      qc.invalidateQueries({ queryKey: ['credit_transactions'] });
      qc.invalidateQueries({ queryKey: ['garage_quotes_today'] });
    },
  });
}

export function submitErrorMessage(error: unknown, cost: number): string {
  if (error instanceof SubmitQuoteError) {
    if (error.code.includes('INSUFFICIENT_CREDITS') || error.status === 402)
      return `You need ${cost} credits to send this quote. Your wallet doesn’t have enough.`;
    if (error.code.includes('QUOTE_DAILY_LIMIT')) return 'You’ve reached the Basic plan’s limit of 3 quotes today. Try again tomorrow.';
    if (error.code === 'REQUEST_NOT_OPEN') return 'This request is no longer open for quotes.';
    if (error.code === 'GARAGE_NOT_ACTIVE') return 'Your garage must be verified before you can quote.';
    if (error.status === 409) return 'You have already quoted on this request.';
  }
  return 'Could not send the quote. Try again.';
}

// ---------------------------------------------------------------- reviews
export type GarageReview = Tables<'reviews'>;

export function useGarageReviews(garageId: string | undefined) {
  return useQuery({
    queryKey: ['reviews', 'garage', garageId],
    enabled: !!garageId,
    queryFn: async (): Promise<GarageReview[]> => {
      const { data, error } = await supabase.from('reviews').select('*').eq('garage_id', garageId!).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useRespondToReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ reviewId, response }: { reviewId: string; response: string }) => {
      // RLS lets the garage update its own reviews; only these two columns are sent (as on the web).
      const { error } = await supabase
        .from('reviews')
        .update({ garage_response: response, garage_responded_at: new Date().toISOString() })
        .eq('id', reviewId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reviews'] }),
  });
}

// ---------------------------------------------------------------- garage conversations
export type GarageConversation = Tables<'conversations'> & {
  customer: { full_name: string } | null;
  service_requests: { title: string } | null;
};

export function useGarageConversations(garageId: string | undefined) {
  return useQuery({
    queryKey: ['conversations', 'garage', garageId],
    enabled: !!garageId,
    queryFn: async (): Promise<GarageConversation[]> => {
      const { data, error } = await supabase
        .from('conversations')
        .select('*, customer:user_profiles!conversations_customer_id_fkey(full_name), service_requests(title)')
        .eq('garage_id', garageId!)
        .order('last_message_at', { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data as unknown as GarageConversation[];
    },
  });
}

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/types/database';
import { GARAGE_SELECT, type GarageWithRelations } from './queries';

export type GarageTransferRow = Tables<'garage_transfers'>;
export type GarageCustomer = {
  customer_id: string;
  full_name: string;
  email: string;
  mobile_number: string | null;
  jobs_total: number;
  jobs_completed: number;
  last_job_at: string | null;
  total_value: number | null;
};

async function userId(): Promise<string> {
  const {
    data: { user },
  } = await createClient().auth.getUser();
  if (!user) throw new Error('Not signed in');
  return user.id;
}

/** All garages the signed-in user owns (multi-garage support). */
export function useMyGarages() {
  return useQuery({
    queryKey: ['garages', 'mine'],
    queryFn: async (): Promise<GarageWithRelations[]> => {
      const { data, error } = await createClient()
        .from('garages')
        .select(GARAGE_SELECT)
        .eq('owner_id', await userId())
        .order('created_at');
      if (error) throw error;
      return data as unknown as GarageWithRelations[];
    },
  });
}

/** One garage by id, pinned to the owner (per-garage dashboard). */
export function useOwnedGarage(id: string) {
  return useQuery({
    queryKey: ['garages', 'mine', id],
    queryFn: async (): Promise<GarageWithRelations> => {
      const { data, error } = await createClient()
        .from('garages')
        .select(GARAGE_SELECT)
        .eq('id', id)
        .eq('owner_id', await userId())
        .single();
      if (error) throw error;
      return data as unknown as GarageWithRelations;
    },
  });
}

// ---------- quotes & jobs ----------

export type GarageQuote = Tables<'quotes'> & {
  service_requests: {
    title: string;
    status: string;
    completed_at: string | null;
    location_town: string | null;
    location_county: string | null;
  } | null;
};

export function useGarageQuotes(garageId: string) {
  return useQuery({
    queryKey: ['quotes', 'garage', garageId, 'with_requests'],
    queryFn: async (): Promise<GarageQuote[]> => {
      const { data, error } = await createClient()
        .from('quotes')
        .select('*, service_requests(title, status, completed_at, location_town, location_county)')
        .eq('garage_id', garageId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as GarageQuote[];
    },
  });
}

// ---------- customer CRM ----------

export function useGarageCustomers(garageId: string) {
  return useQuery({
    queryKey: ['garage_customers', garageId],
    queryFn: async (): Promise<GarageCustomer[]> => {
      const { data, error } = await createClient().rpc('get_garage_customers', {
        p_garage_id: garageId,
      });
      if (error) throw error;
      return data as GarageCustomer[];
    },
  });
}

// ---------- ownership transfer ----------

export function useGarageTransfers() {
  return useQuery({
    queryKey: ['garage_transfers'],
    queryFn: async (): Promise<{ rows: GarageTransferRow[]; userId: string }> => {
      const uid = await userId();
      const { data, error } = await createClient()
        .from('garage_transfers')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return { rows: data, userId: uid };
    },
  });
}

export function useInitiateGarageTransfer(garageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (toEmail: string) => {
      const { error } = await createClient().rpc('initiate_garage_transfer', {
        p_garage_id: garageId,
        p_to_email: toEmail,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['garage_transfers'] }),
  });
}

export function useRespondGarageTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ transferId, accept }: { transferId: string; accept: boolean }) => {
      const { error } = await createClient().rpc('respond_garage_transfer', {
        p_transfer_id: transferId,
        p_accept: accept,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['garage_transfers'] });
      qc.invalidateQueries({ queryKey: ['garages'] });
    },
  });
}

export function useCancelGarageTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (transferId: string) => {
      const { error } = await createClient().rpc('cancel_garage_transfer', {
        p_transfer_id: transferId,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['garage_transfers'] }),
  });
}

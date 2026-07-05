'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Tables, TablesInsert } from '@/types/database';
import type { VehicleData } from '@/lib/validation/vehicle';

export type VehicleRow = Tables<'vehicles'> & {
  vehicle_makes: { name: string } | null;
  vehicle_models: { name: string } | null;
  vehicle_engines: { label: string } | null;
};

const VEHICLE_SELECT = '*, vehicle_makes(name), vehicle_models(name), vehicle_engines(label)';

function toDbRow(v: VehicleData, ownerId: string): TablesInsert<'vehicles'> {
  return {
    owner_id: ownerId,
    registration_number: v.registrationNumber,
    make_id: v.makeId,
    make_text: v.makeText || null,
    model_id: v.modelId,
    model_text: v.modelText || null,
    variant: v.variant || null,
    year: v.year,
    engine_id: v.engineId,
    engine_size_custom: v.engineSizeCustom || null,
    fuel_type: v.fuelType,
    transmission: v.transmission,
    vin: v.vin || null,
    mileage_km: v.mileageKm,
    lookup_source: 'manual',
  };
}

async function ownerId(): Promise<string> {
  const {
    data: { user },
  } = await createClient().auth.getUser();
  if (!user) throw new Error('Not signed in');
  return user.id;
}

export function useVehicles() {
  return useQuery({
    queryKey: ['vehicles'],
    queryFn: async (): Promise<VehicleRow[]> => {
      const { data, error } = await createClient()
        .from('vehicles')
        .select(VEHICLE_SELECT)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useVehicle(id: string) {
  return useQuery({
    queryKey: ['vehicles', id],
    queryFn: async (): Promise<VehicleRow> => {
      const { data, error } = await createClient()
        .from('vehicles')
        .select(VEHICLE_SELECT)
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useMakes() {
  return useQuery({
    queryKey: ['vehicle_makes'],
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await createClient().from('vehicle_makes').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });
}

export function useModels(makeId: string | null) {
  return useQuery({
    queryKey: ['vehicle_models', makeId],
    enabled: !!makeId,
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await createClient()
        .from('vehicle_models')
        .select('*')
        .eq('make_id', makeId!)
        .order('name');
      if (error) throw error;
      return data;
    },
  });
}

export function useEngines() {
  return useQuery({
    queryKey: ['vehicle_engines'],
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await createClient()
        .from('vehicle_engines')
        .select('*')
        .order('is_custom')
        .order('litres', { nullsFirst: false });
      if (error) throw error;
      return data;
    },
  });
}

/** Duplicate reg for the same owner (unique owner_id+registration_number). */
export function isDuplicateReg(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
}

export function useCreateVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: VehicleData) => {
      const { data, error } = await createClient()
        .from('vehicles')
        .insert(toDbRow(v, await ownerId()))
        .select(VEHICLE_SELECT)
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vehicles'] }),
  });
}

export function useUpdateVehicle(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: VehicleData) => {
      const { data, error } = await createClient()
        .from('vehicles')
        .update(toDbRow(v, await ownerId()))
        .eq('id', id)
        .select(VEHICLE_SELECT)
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vehicles'] }),
  });
}

export function useDeleteVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await createClient().from('vehicles').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vehicles'] }),
  });
}

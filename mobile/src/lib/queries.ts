// Data hooks for the car-owner / fleet side. Queries and keys mirror the web
// (src/lib/*/queries.ts) so behaviour and RLS assumptions stay identical.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { API_URL, currentUserId, supabase } from './supabase';
import type { Tables, TablesInsert } from '@/shared/database';
import type { VehicleData } from '@/shared/validation/vehicle';
import type { ServiceRequestData } from '@/shared/validation/request';

// ---------------------------------------------------------------- vehicles
export type VehicleRow = Tables<'vehicles'> & {
  vehicle_makes: { name: string } | null;
  vehicle_models: { name: string } | null;
  vehicle_engines: { label: string } | null;
};
const VEHICLE_SELECT = '*, vehicle_makes(name), vehicle_models(name), vehicle_engines(label)';

export function vehicleName(v: Pick<VehicleRow, 'year' | 'make_text' | 'model_text' | 'vehicle_makes' | 'vehicle_models'>) {
  return [v.year, v.vehicle_makes?.name ?? v.make_text, v.vehicle_models?.name ?? v.model_text].filter(Boolean).join(' ');
}

// RLS lets active garages read vehicles on open requests — "my vehicles" must scope to the owner.
export function useVehicles() {
  return useQuery({
    queryKey: ['vehicles'],
    queryFn: async (): Promise<VehicleRow[]> => {
      const { data, error } = await supabase
        .from('vehicles')
        .select(VEHICLE_SELECT)
        .eq('owner_id', await currentUserId())
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as VehicleRow[];
    },
  });
}

export function useVehicle(id: string) {
  return useQuery({
    queryKey: ['vehicles', id],
    queryFn: async (): Promise<VehicleRow> => {
      const { data, error } = await supabase
        .from('vehicles')
        .select(VEHICLE_SELECT)
        .eq('id', id)
        .eq('owner_id', await currentUserId())
        .single();
      if (error) throw error;
      return data as VehicleRow;
    },
  });
}

export function useMakes() {
  return useQuery({
    queryKey: ['vehicle_makes'],
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await supabase.from('vehicle_makes').select('id, name').order('name');
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
      const { data, error } = await supabase.from('vehicle_models').select('id, name').eq('make_id', makeId!).order('name');
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: VehicleData) => {
      const row: TablesInsert<'vehicles'> = {
        owner_id: await currentUserId(),
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
      const { data, error } = await supabase.from('vehicles').insert(row).select(VEHICLE_SELECT).single();
      if (error) throw error;
      return data as VehicleRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vehicles'] }),
  });
}

export function useDeleteVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('vehicles').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vehicles'] }),
  });
}

export function vehicleErrorMessage(error: unknown): string {
  const e = error as { code?: string; message?: string } | null;
  if (e?.code === '23505') return 'You already have a vehicle with that registration.';
  if (e?.message?.includes('VEHICLE_LIMIT')) return 'Personal accounts can hold up to 3 vehicles. Switch to Garix for business to add more.';
  if (e?.message?.includes('FLEET_BILLING')) return 'Your Garix for business billing needs attention before you can add more vehicles.';
  if (e?.code === '23503') return 'This vehicle is linked to a repair request, so it can’t be removed yet.';
  return 'Something went wrong. Try again.';
}

// ---------------------------------------------------------------- requests
export type RepairCategory = Pick<Tables<'repair_categories'>, 'id' | 'name' | 'parent_id'>;

export function useRepairCategories() {
  return useQuery({
    queryKey: ['repair_categories'],
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await supabase.from('repair_categories').select('id, name, parent_id').order('sort_order').order('name');
      if (error) throw error;
      const parents = data.filter((c) => !c.parent_id);
      const childrenByParent = new Map<string, RepairCategory[]>();
      for (const c of data) {
        if (!c.parent_id) continue;
        childrenByParent.set(c.parent_id, [...(childrenByParent.get(c.parent_id) ?? []), c]);
      }
      return { parents, childrenByParent };
    },
  });
}

const REQUEST_SELECT =
  '*, vehicles(registration_number, make_text, model_text, year, vehicle_makes(name), vehicle_models(name)), request_attachments(id)';
export type RequestRow = Tables<'service_requests'> & {
  vehicles: Pick<VehicleRow, 'registration_number' | 'make_text' | 'model_text' | 'year' | 'vehicle_makes' | 'vehicle_models'> | null;
  request_attachments: { id: string }[];
};

// RLS also shows garages the open-request feed — scope to the customer explicitly.
export function useMyRequests() {
  return useQuery({
    queryKey: ['service_requests', 'mine'],
    queryFn: async (): Promise<RequestRow[]> => {
      const { data, error } = await supabase
        .from('service_requests')
        .select(REQUEST_SELECT)
        .eq('customer_id', await currentUserId())
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as RequestRow[];
    },
  });
}

export function useMyRequest(id: string) {
  return useQuery({
    queryKey: ['service_requests', 'mine', id],
    queryFn: async (): Promise<RequestRow> => {
      const { data, error } = await supabase
        .from('service_requests')
        .select(REQUEST_SELECT)
        .eq('id', id)
        .eq('customer_id', await currentUserId())
        .single();
      if (error) throw error;
      return data as RequestRow;
    },
  });
}

export type PickedPhoto = { uri: string; mimeType: string; fileName: string };

export function useCreateRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ data, photos }: { data: ServiceRequestData; photos: PickedPhoto[] }) => {
      const uid = await currentUserId();
      const { data: request, error } = await supabase
        .from('service_requests')
        .insert({
          customer_id: uid,
          vehicle_id: data.vehicleId,
          service_category_id: data.serviceCategoryId,
          problem_category_id: data.problemCategoryId,
          title: data.title,
          description: data.description,
          urgency: data.urgency,
          location_town: data.locationTown,
          location_county: data.locationCounty,
          location: data.lat != null && data.lng != null ? (`SRID=4326;POINT(${data.lng} ${data.lat})` as unknown as null) : null,
          collection_required: data.collectionRequired,
          expected_completion_date: data.expectedCompletionDate,
          budget_amount: data.budgetAmount,
        })
        .select()
        .single();
      if (error) throw error;

      let failed = 0;
      for (const photo of photos) {
        try {
          const ext = photo.fileName.includes('.') ? photo.fileName.slice(photo.fileName.lastIndexOf('.')) : '.jpg';
          const path = `${uid}/${request.id}/${Math.random().toString(36).slice(2)}${Date.now()}${ext}`;
          const body = await (await fetch(photo.uri)).arrayBuffer();
          const up = await supabase.storage.from('service-requests').upload(path, body, { contentType: photo.mimeType });
          if (up.error) throw up.error;
          const att = await supabase.from('request_attachments').insert({
            request_id: request.id,
            storage_path: path,
            media_type: photo.mimeType.startsWith('video/') ? 'video' : 'image',
          });
          if (att.error) throw att.error;
        } catch {
          failed++;
        }
      }
      return { request, failed };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['service_requests'] }),
  });
}

/** Requests can be edited until the first quote arrives; deleted until a quote is accepted. */
export const EDITABLE_REQUEST_STATUSES = ['draft', 'open'];
export const DELETABLE_REQUEST_STATUSES = ['draft', 'open', 'quoted', 'expired'];

// The RPC accepts SQL nulls for optional fields; generated arg types do not say so.
const sqlNull = <T,>(v: T | null): T => v as T;

export function useUpdateRequest(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: ServiceRequestData) => {
      const { error } = await supabase.rpc('update_my_request', {
        p_request_id: id,
        p_vehicle_id: data.vehicleId,
        p_service_category_id: data.serviceCategoryId,
        p_problem_category_id: sqlNull(data.problemCategoryId),
        p_title: data.title,
        p_description: data.description,
        p_urgency: data.urgency,
        p_location_town: data.locationTown,
        p_location_county: data.locationCounty,
        p_lat: sqlNull(data.lat),
        p_lng: sqlNull(data.lng),
        p_collection_required: data.collectionRequired,
        p_expected_completion_date: sqlNull(data.expectedCompletionDate),
        p_budget_amount: sqlNull(data.budgetAmount),
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['service_requests'] }),
  });
}

export function useDeleteRequest(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<'deleted' | 'cancelled'> => {
      const { data: attachments } = await supabase.from('request_attachments').select('storage_path').eq('request_id', id);
      const { data, error } = await supabase.rpc('delete_my_request', { p_request_id: id });
      if (error) throw error;
      const outcome = data === 'deleted' ? 'deleted' : 'cancelled';
      if (outcome === 'deleted' && attachments?.length) {
        await supabase.storage.from('service-requests').remove(attachments.map((a) => a.storage_path));
      }
      return outcome;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['service_requests'] }),
  });
}

export function requestActionError(error: unknown): string {
  const message = (error as { message?: string } | null)?.message ?? '';
  if (message.includes('REQUEST_NOT_EDITABLE')) return 'A garage has already quoted on this request, so it can no longer be edited.';
  if (message.includes('REQUEST_NOT_DELETABLE')) return 'This job is already under way, so the request can no longer be deleted.';
  if (message.includes('VEHICLE_NOT_OWNED')) return 'Choose one of your own vehicles.';
  return 'Something went wrong. Try again.';
}

// ---------------------------------------------------------------- quotes
export type QuoteWithGarage = Tables<'quotes'> & {
  garages: { name: string; slug: string; avg_rating: number | null; review_count: number | null } | null;
  quote_items: Tables<'quote_items'>[];
};

export function useRequestQuotes(requestId: string) {
  return useQuery({
    queryKey: ['quotes', 'request', requestId],
    queryFn: async (): Promise<QuoteWithGarage[]> => {
      const { data, error } = await supabase
        .from('quotes')
        .select('*, garages(name, slug, avg_rating, review_count), quote_items(*)')
        .eq('request_id', requestId)
        .order('created_at');
      if (error) throw error;
      return data as QuoteWithGarage[];
    },
  });
}

export function useAcceptQuote(requestId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (quoteId: string) => {
      const { error } = await supabase.rpc('accept_quote', { p_quote_id: quoteId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quotes', 'request', requestId] });
      qc.invalidateQueries({ queryKey: ['service_requests'] });
    },
  });
}

// ---------------------------------------------------------------- account
export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { fullName: string; mobileNumber: string | null }) => {
      const { error } = await supabase
        .from('user_profiles')
        .update({ full_name: v.fullName, mobile_number: v.mobileNumber })
        .eq('id', await currentUserId());
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user_profiles'] }),
  });
}

export function useDeletionBlockers(enabled: boolean) {
  return useQuery({
    queryKey: ['account_deletion_blockers'],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('account_deletion_blockers');
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Calls the web API (it needs the service role to remove the auth user and files). */
export function useDeleteAccount() {
  return useMutation({
    mutationFn: async (confirmEmail: string) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error('UNAUTHENTICATED');
      const res = await fetch(`${API_URL}/api/account/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ confirmEmail }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; blockers?: string[] };
      if (!res.ok) throw Object.assign(new Error(body.error ?? 'DELETE_FAILED'), { blockers: body.blockers ?? [] });
      await supabase.auth.signOut();
    },
  });
}

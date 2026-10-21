'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/types/database';
import type { ServiceRequestData } from '@/lib/validation/request';

export type RepairCategory = Tables<'repair_categories'>;

export function useRepairCategories() {
  return useQuery({
    queryKey: ['repair_categories'],
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await createClient()
        .from('repair_categories')
        .select('*')
        .order('sort_order')
        .order('name');
      if (error) throw error;
      const parents = data.filter((c) => !c.parent_id);
      const childrenByParent = new Map<string, RepairCategory[]>();
      for (const c of data) {
        if (!c.parent_id) continue;
        const list = childrenByParent.get(c.parent_id) ?? [];
        list.push(c);
        childrenByParent.set(c.parent_id, list);
      }
      return { parents, childrenByParent };
    },
  });
}

export function useMyRequests() {
  return useQuery({
    queryKey: ['service_requests', 'mine'],
    queryFn: async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in');
      // RLS also shows garages the open-request feed — "my requests" must
      // scope to the customer explicitly.
      const { data, error } = await supabase
        .from('service_requests')
        .select('*, vehicles(registration_number, make_text, vehicle_makes(name), vehicle_models(name)), request_attachments(id)')
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export type CreateRequestResult = {
  request: Tables<'service_requests'>;
  /** Names of files that failed to upload or attach (request itself succeeded). */
  failedAttachments: string[];
};

export function useCreateRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      data,
      files,
    }: {
      data: ServiceRequestData;
      files: File[];
    }): Promise<CreateRequestResult> => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in');

      const { data: request, error } = await supabase
        .from('service_requests')
        .insert({
          customer_id: user.id,
          vehicle_id: data.vehicleId,
          service_category_id: data.serviceCategoryId,
          problem_category_id: data.problemCategoryId,
          title: data.title,
          description: data.description,
          urgency: data.urgency,
          location_town: data.locationTown,
          location_county: data.locationCounty,
          // PostGIS geography accepts EWKT text; lon before lat.
          location:
            data.lat != null && data.lng != null
              ? (`SRID=4326;POINT(${data.lng} ${data.lat})` as unknown as null)
              : null,
          collection_required: data.collectionRequired,
          expected_completion_date: data.expectedCompletionDate,
          budget_amount: data.budgetAmount,
        })
        .select()
        .single();
      if (error) throw error;

      const failedAttachments: string[] = [];
      for (const file of files) {
        const ext = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')) : '';
        const path = `${user.id}/${request.id}/${crypto.randomUUID()}${ext}`;
        const up = await supabase.storage.from('service-requests').upload(path, file);
        if (up.error) {
          failedAttachments.push(file.name);
          continue;
        }
        const att = await supabase.from('request_attachments').insert({
          request_id: request.id,
          storage_path: path,
          media_type: file.type.startsWith('video/') ? 'video' : 'image',
        });
        if (att.error) failedAttachments.push(file.name);
      }

      return { request, failedAttachments };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['service_requests'] }),
  });
}

/** Requests can be edited until the first quote arrives. */
export const EDITABLE_REQUEST_STATUSES = ['draft', 'open'] as const;
/** Requests can be deleted (or cancelled, if quoted) until a quote is accepted. */
export const DELETABLE_REQUEST_STATUSES = ['draft', 'open', 'quoted', 'expired'] as const;

// The RPC accepts SQL nulls for optional fields; generated arg types do not say so.
const sqlNull = <T,>(v: T | null): T => v as T;

export function useUpdateRequest(requestId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: ServiceRequestData) => {
      const { error } = await createClient().rpc('update_my_request', {
        p_request_id: requestId,
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

/**
 * Deletes a request with no quotes (and its photos), or cancels one that has
 * quotes so garages keep their record. Resolves to what happened.
 */
export function useDeleteRequest(requestId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<'deleted' | 'cancelled'> => {
      const supabase = createClient();
      const { data: attachments } = await supabase
        .from('request_attachments')
        .select('storage_path')
        .eq('request_id', requestId);
      const { data, error } = await supabase.rpc('delete_my_request', { p_request_id: requestId });
      if (error) throw error;
      const outcome = data === 'deleted' ? 'deleted' : 'cancelled';
      if (outcome === 'deleted' && attachments?.length) {
        // Best effort: the row is gone either way; files are swept on account deletion too.
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

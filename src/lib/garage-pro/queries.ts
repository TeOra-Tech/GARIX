'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/types/database';
import {
  garagePlanIsPro,
  usePlansEnabled,
  useGarageSubscription,
} from '@/lib/garage-plan/queries';

export type Booking = Tables<'bookings'>;
export type GarageReminder = Tables<'garage_reminders'>;
export type VehicleHistoryRow = Tables<'vehicle_history'>;

export type GarageAnalytics = {
  quotes_total: number;
  quotes_accepted: number;
  quotes_rejected: number;
  quotes_30d: number;
  accepted_30d: number;
  jobs_completed: number;
  total_job_value: number;
  avg_quote_value: number;
  avg_rating: number;
  review_count: number;
  credits_spent: number;
  customers: number;
  bookings_upcoming: number;
};

export type ServicedVehicle = {
  vehicle_id: string;
  registration_number: string;
  make: string | null;
  model: string | null;
  year: number | null;
  jobs: number;
  last_job_at: string | null;
  record_count: number;
};

/** Whether Pro features are gated for this garage (plans on + not Pro). */
export function useGarageProAccess(garageId: string) {
  const plansEnabled = usePlansEnabled();
  const sub = useGarageSubscription(garageId);
  const isPro = garagePlanIsPro(sub.data);
  const ready = plansEnabled.isSuccess && sub.isSuccess;
  return { isPro, plansEnabled: !!plansEnabled.data, gated: !!plansEnabled.data && !isPro, ready };
}

function isProRequired(error: unknown): boolean {
  return error instanceof Error && error.message.includes('PRO_REQUIRED');
}

// ---------- analytics ----------
export function useGarageAnalytics(garageId: string) {
  return useQuery({
    queryKey: ['garage_analytics', garageId],
    retry: false,
    queryFn: async (): Promise<GarageAnalytics> => {
      const { data, error } = await createClient().rpc('get_garage_analytics', { p_garage_id: garageId });
      if (error) throw error;
      return data as unknown as GarageAnalytics;
    },
  });
}

// ---------- bookings ----------
export function useBookings(garageId: string) {
  return useQuery({
    queryKey: ['bookings', garageId],
    queryFn: async (): Promise<Booking[]> => {
      const { data, error } = await createClient()
        .from('bookings')
        .select('*')
        .eq('garage_id', garageId)
        .order('scheduled_at', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateBooking(garageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (b: {
      title: string; scheduledAt: string; durationMinutes: number;
      customerName?: string; customerPhone?: string; vehicleReg?: string; notes?: string;
    }) => {
      const { error } = await createClient().from('bookings').insert({
        garage_id: garageId, title: b.title, scheduled_at: b.scheduledAt,
        duration_minutes: b.durationMinutes, customer_name: b.customerName || null,
        customer_phone: b.customerPhone || null, vehicle_reg: b.vehicleReg || null,
        notes: b.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookings', garageId] }),
  });
}

export function useUpdateBookingStatus(garageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await createClient().from('bookings').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookings', garageId] }),
  });
}

export function useDeleteBooking(garageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await createClient().from('bookings').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookings', garageId] }),
  });
}

// ---------- garage reminders ----------
export function useGarageReminders(garageId: string) {
  return useQuery({
    queryKey: ['garage_reminders', garageId],
    queryFn: async (): Promise<GarageReminder[]> => {
      const { data, error } = await createClient()
        .from('garage_reminders')
        .select('*')
        .eq('garage_id', garageId)
        .order('due_date', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateGarageReminder(garageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (r: {
      reminderType: string; title?: string; dueDate: string; message?: string;
      customerId?: string | null; customerName?: string; vehicleReg?: string; notifyCustomer: boolean;
    }) => {
      const { error } = await createClient().from('garage_reminders').insert({
        garage_id: garageId, reminder_type: r.reminderType, title: r.title || null,
        due_date: r.dueDate, message: r.message || null, customer_id: r.customerId || null,
        customer_name: r.customerName || null, vehicle_reg: r.vehicleReg || null,
        notify_customer: r.notifyCustomer,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['garage_reminders', garageId] }),
  });
}

export function useCompleteGarageReminder(garageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await createClient()
        .from('garage_reminders')
        .update({ completed_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['garage_reminders', garageId] }),
  });
}

export function useDeleteGarageReminder(garageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await createClient().from('garage_reminders').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['garage_reminders', garageId] }),
  });
}

// ---------- garage-side vehicle service history ----------
export function useServicedVehicles(garageId: string) {
  return useQuery({
    queryKey: ['serviced_vehicles', garageId],
    retry: false,
    queryFn: async (): Promise<ServicedVehicle[]> => {
      const { data, error } = await createClient().rpc('get_garage_serviced_vehicles', { p_garage_id: garageId });
      if (error) throw error;
      return (data ?? []) as unknown as ServicedVehicle[];
    },
  });
}

export function useGarageVehicleHistory(garageId: string, vehicleId: string | null) {
  return useQuery({
    queryKey: ['garage_vehicle_history', garageId, vehicleId],
    enabled: !!vehicleId,
    queryFn: async (): Promise<VehicleHistoryRow[]> => {
      const { data, error } = await createClient().rpc('get_garage_vehicle_history', {
        p_garage_id: garageId, p_vehicle_id: vehicleId!,
      });
      if (error) throw error;
      return (data ?? []) as VehicleHistoryRow[];
    },
  });
}

export function useAddGarageServiceRecord(garageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (r: {
      vehicleId: string; eventType: string; eventDate: string; title?: string;
      description?: string; partsReplaced?: string; mileageKm?: number | null;
      costEur?: number | null; warrantyUntil?: string | null; nextDueDate?: string | null;
    }) => {
      const { error } = await createClient().rpc('add_garage_service_record', {
        p_garage_id: garageId, p_vehicle_id: r.vehicleId, p_event_type: r.eventType,
        p_event_date: r.eventDate, p_title: r.title || undefined, p_description: r.description || undefined,
        p_parts_replaced: r.partsReplaced || undefined, p_mileage_km: r.mileageKm ?? undefined,
        p_cost_eur: r.costEur ?? undefined, p_warranty_until: r.warrantyUntil ?? undefined,
        p_next_due_date: r.nextDueDate ?? undefined,
      });
      if (error) throw error;
    },
    onSuccess: (_d, r) => {
      qc.invalidateQueries({ queryKey: ['garage_vehicle_history', garageId, r.vehicleId] });
      qc.invalidateQueries({ queryKey: ['serviced_vehicles', garageId] });
    },
  });
}

export { isProRequired };

// Service history, reminders and ownership transfers. Mirrors the web's src/lib/vehicles/care.ts.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { currentUserId, supabase } from './supabase';
import type { Tables } from '@/shared/database';
import type { ReminderData, ServiceRecordData } from '@/shared/validation/vehicle-care';

export type ServiceRecordRow = Tables<'vehicle_history'>;
export type ReminderRow = Tables<'vehicle_reminders'>;
export type TransferRow = Tables<'vehicle_transfers'>;

/** YYYY-MM-DD in local time (toISOString would shift a day in Irish summer time). */
export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function formatDate(iso: string | null): string {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ---------------------------------------------------------------- service history
export function useServiceRecords(vehicleId: string) {
  return useQuery({
    queryKey: ['vehicle_history', vehicleId],
    queryFn: async (): Promise<ServiceRecordRow[]> => {
      const { data, error } = await supabase
        .from('vehicle_history')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .order('event_date', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useAddServiceRecord(vehicleId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (r: ServiceRecordData) => {
      const { error } = await supabase.from('vehicle_history').insert({
        vehicle_id: vehicleId,
        event_type: r.eventType,
        event_date: r.eventDate,
        title: r.title || null,
        description: r.description || null,
        parts_replaced: r.partsReplaced || null,
        mileage_km: r.mileageKm,
        cost_eur: r.costEur,
        garage_name: r.garageName || null,
        warranty_until: r.warrantyUntil,
        next_due_date: r.nextDueDate,
        next_due_mileage_km: r.nextDueMileageKm,
        created_by: await currentUserId(),
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vehicle_history', vehicleId] }),
  });
}

export function useDeleteServiceRecord(vehicleId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('vehicle_history').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vehicle_history', vehicleId] }),
  });
}

// ---------------------------------------------------------------- reminders
export function useReminders(vehicleId: string) {
  return useQuery({
    queryKey: ['vehicle_reminders', vehicleId],
    queryFn: async (): Promise<ReminderRow[]> => {
      const { data, error } = await supabase.from('vehicle_reminders').select('*').eq('vehicle_id', vehicleId).order('due_date');
      if (error) throw error;
      return data;
    },
  });
}

export type UpcomingReminder = ReminderRow & {
  vehicles: { registration_number: string; owner_id: string } | null;
};

/** Open reminders across the user's own vehicles (Home). */
export function useUpcomingReminders() {
  return useQuery({
    queryKey: ['vehicle_reminders', 'upcoming'],
    queryFn: async (): Promise<UpcomingReminder[]> => {
      const uid = await currentUserId();
      const { data, error } = await supabase
        .from('vehicle_reminders')
        .select('*, vehicles!inner(registration_number, owner_id)')
        .eq('vehicles.owner_id', uid)
        .is('completed_at', null)
        .order('due_date')
        .limit(5);
      if (error) throw error;
      return data as UpcomingReminder[];
    },
  });
}

export function useAddReminder(vehicleId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (r: ReminderData) => {
      const { error } = await supabase.from('vehicle_reminders').insert({
        vehicle_id: vehicleId,
        reminder_type: r.reminderType,
        title: r.title || null,
        due_date: r.dueDate,
        due_mileage_km: r.dueMileageKm,
        interval_months: r.intervalMonths,
        notes: r.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vehicle_reminders'] }),
  });
}

/** Mark done. Recurring reminders roll forward to the next occurrence instead of completing. */
export function useCompleteReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (reminder: ReminderRow) => {
      if (reminder.interval_months) {
        const [y, m, d] = reminder.due_date.split('-').map(Number);
        const nextDue = isoDate(new Date(y, m - 1 + reminder.interval_months, d));
        const { error } = await supabase.from('vehicle_reminders').update({ due_date: nextDue }).eq('id', reminder.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('vehicle_reminders')
          .update({ completed_at: new Date().toISOString() })
          .eq('id', reminder.id);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vehicle_reminders'] }),
  });
}

export function useDeleteReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('vehicle_reminders').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vehicle_reminders'] }),
  });
}

// ---------------------------------------------------------------- ownership transfer
/** Transfers involving the current user (RLS restricts to those). */
export function useTransfers() {
  return useQuery({
    queryKey: ['vehicle_transfers'],
    queryFn: async (): Promise<{ rows: TransferRow[]; userId: string }> => {
      const uid = await currentUserId();
      const { data, error } = await supabase.from('vehicle_transfers').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return { rows: data, userId: uid };
    },
  });
}

export function useInitiateTransfer(vehicleId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (toEmail: string) => {
      const { error } = await supabase.rpc('initiate_vehicle_transfer', { p_vehicle_id: vehicleId, p_to_email: toEmail });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vehicle_transfers'] }),
  });
}

export function useRespondTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ transferId, accept }: { transferId: string; accept: boolean }) => {
      const { error } = await supabase.rpc('respond_vehicle_transfer', { p_transfer_id: transferId, p_accept: accept });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehicle_transfers'] });
      qc.invalidateQueries({ queryKey: ['vehicles'] });
      qc.invalidateQueries({ queryKey: ['vehicle_reminders'] });
    },
  });
}

export function useCancelTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (transferId: string) => {
      const { error } = await supabase.rpc('cancel_vehicle_transfer', { p_transfer_id: transferId });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vehicle_transfers'] }),
  });
}

/** The database raises plain-English messages for transfers; vehicle-limit codes get friendlier text. */
export function transferErrorMessage(error: unknown): string {
  const message = (error as { message?: string } | null)?.message ?? '';
  if (message.includes('VEHICLE_LIMIT_REACHED')) return 'The new owner has reached the 3-vehicle limit for personal accounts.';
  if (message.includes('FLEET_BILLING_REQUIRED')) return 'The new owner’s business billing needs attention before they can take more vehicles.';
  return message || 'Something went wrong. Try again.';
}

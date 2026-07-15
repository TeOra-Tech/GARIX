'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/types/database';
import type { ReminderData, ServiceRecordData } from '@/lib/validation/vehicle-care';

export type ServiceRecordRow = Tables<'vehicle_history'>;
export type ReminderRow = Tables<'vehicle_reminders'>;
export type TransferRow = Tables<'vehicle_transfers'>;

async function userId(): Promise<string> {
  const {
    data: { user },
  } = await createClient().auth.getUser();
  if (!user) throw new Error('Not signed in');
  return user.id;
}

// ---------- digital service history ----------

export function useServiceRecords(vehicleId: string) {
  return useQuery({
    queryKey: ['vehicle_history', vehicleId],
    queryFn: async (): Promise<ServiceRecordRow[]> => {
      const { data, error } = await createClient()
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
      const { error } = await createClient().from('vehicle_history').insert({
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
        created_by: await userId(),
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
      const { error } = await createClient().from('vehicle_history').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vehicle_history', vehicleId] }),
  });
}

// ---------- maintenance reminders ----------

export function useReminders(vehicleId: string) {
  return useQuery({
    queryKey: ['vehicle_reminders', vehicleId],
    queryFn: async (): Promise<ReminderRow[]> => {
      const { data, error } = await createClient()
        .from('vehicle_reminders')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .order('due_date');
      if (error) throw error;
      return data;
    },
  });
}

export type UpcomingReminder = ReminderRow & {
  vehicles: { registration_number: string; make_text: string | null; model_text: string | null } | null;
};

/** Open reminders across all of the user's vehicles — dashboard overview. */
export function useUpcomingReminders() {
  return useQuery({
    queryKey: ['vehicle_reminders', 'upcoming'],
    queryFn: async (): Promise<UpcomingReminder[]> => {
      const { data, error } = await createClient()
        .from('vehicle_reminders')
        .select('*, vehicles(registration_number, make_text, model_text)')
        .is('completed_at', null)
        .order('due_date')
        .limit(8);
      if (error) throw error;
      return data;
    },
  });
}

export function useAddReminder(vehicleId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (r: ReminderData) => {
      const { error } = await createClient().from('vehicle_reminders').insert({
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

/**
 * Mark done. Recurring reminders (interval_months) roll forward to the next
 * occurrence instead of completing, and re-arm their notification.
 */
export function useCompleteReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (reminder: ReminderRow) => {
      const supabase = createClient();
      if (reminder.interval_months) {
        // calendar arithmetic, not toISOString(): UTC conversion would shift
        // local midnight back a day during Irish summer time
        const [y, m, d] = reminder.due_date.split('-').map(Number);
        const next = new Date(y, m - 1 + reminder.interval_months, d);
        const nextDue = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
        const { error } = await supabase
          .from('vehicle_reminders')
          .update({ due_date: nextDue })
          .eq('id', reminder.id);
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
      const { error } = await createClient().from('vehicle_reminders').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vehicle_reminders'] }),
  });
}

// ---------- vehicle photo ----------

/** Signed URL for the private vehicle photo; null when the vehicle has none. */
export function useVehiclePhotoUrl(photoPath: string | null) {
  return useQuery({
    queryKey: ['vehicle_photo', photoPath],
    enabled: !!photoPath,
    staleTime: 50 * 60 * 1000, // signed for 60 min
    queryFn: async (): Promise<string> => {
      const { data, error } = await createClient()
        .storage.from('vehicle-images')
        .createSignedUrl(photoPath!, 60 * 60);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}

const MAX_PHOTO_MB = 5;

export function useSetVehiclePhoto(vehicleId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, previousPath }: { file: File; previousPath: string | null }) => {
      if (!file.type.startsWith('image/')) throw new Error('Choose an image file');
      if (file.size > MAX_PHOTO_MB * 1024 * 1024) {
        throw new Error(`Photos must be under ${MAX_PHOTO_MB} MB`);
      }
      const supabase = createClient();
      const uid = await userId();
      const ext = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')) : '';
      const path = `${uid}/${vehicleId}/${crypto.randomUUID()}${ext}`;
      const up = await supabase.storage.from('vehicle-images').upload(path, file);
      if (up.error) throw up.error;
      const { error } = await supabase.from('vehicles').update({ photo_path: path }).eq('id', vehicleId);
      if (error) throw error;
      if (previousPath) {
        await supabase.storage.from('vehicle-images').remove([previousPath]);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehicles'] });
      qc.invalidateQueries({ queryKey: ['vehicle_photo'] });
    },
  });
}

// ---------- ownership transfer ----------

/** Transfers involving the current user (RLS restricts to those). */
export function useTransfers() {
  return useQuery({
    queryKey: ['vehicle_transfers'],
    queryFn: async (): Promise<{ rows: TransferRow[]; userId: string }> => {
      const uid = await userId();
      const { data, error } = await createClient()
        .from('vehicle_transfers')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return { rows: data, userId: uid };
    },
  });
}

export function useInitiateTransfer(vehicleId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (toEmail: string) => {
      const { error } = await createClient().rpc('initiate_vehicle_transfer', {
        p_vehicle_id: vehicleId,
        p_to_email: toEmail,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vehicle_transfers'] }),
  });
}

export function useRespondTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ transferId, accept }: { transferId: string; accept: boolean }) => {
      const { error } = await createClient().rpc('respond_vehicle_transfer', {
        p_transfer_id: transferId,
        p_accept: accept,
      });
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
      const { error } = await createClient().rpc('cancel_vehicle_transfer', {
        p_transfer_id: transferId,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vehicle_transfers'] }),
  });
}

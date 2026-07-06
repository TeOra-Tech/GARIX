'use client';

import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Tables, TablesUpdate } from '@/types/database';

export type Notification = Tables<'notifications'>;

export function useNotifications(userId: string | undefined) {
  return useQuery({
    queryKey: ['notifications', userId],
    enabled: !!userId,
    queryFn: async (): Promise<Notification[]> => {
      const { data, error } = await createClient()
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(15);
      if (error) throw error;
      return data;
    },
  });
}

export function useUnreadNotificationCount(userId: string | undefined) {
  return useQuery({
    queryKey: ['notifications', 'unread_count', userId],
    enabled: !!userId,
    queryFn: async (): Promise<number> => {
      const { count, error } = await createClient()
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .is('read_at', null);
      if (error) throw error;
      return count ?? 0;
    },
  });
}

export function useRealtimeNotifications(userId: string | undefined) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => qc.invalidateQueries({ queryKey: ['notifications'] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, qc]);
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await createClient()
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .is('read_at', null);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

/** Where the bell should take the user, by notification type. */
export function notificationHref(n: Notification): string {
  const data = (n.data ?? {}) as Record<string, string>;
  switch (n.type) {
    case 'new_quote':
    case 'quote_accepted':
    case 'quote_rejected':
    case 'job_completed':
      return data.request_id ? `/dashboard/requests/${data.request_id}` : '/dashboard/requests';
    case 'new_message':
      return data.conversation_id ? `/dashboard/messages/${data.conversation_id}` : '/dashboard/messages';
    case 'credit_purchase':
    case 'credit_low':
      return '/dashboard/wallet';
    case 'garage_approved':
    case 'garage_rejected':
      return '/dashboard/garage';
    case 'new_review':
      return '/dashboard/garage';
    case 'new_service_request':
      return '/dashboard/garage/requests';
    default:
      return '/dashboard';
  }
}

// ---------- preferences ----------

export type NotificationPreferences = Tables<'notification_preferences'>;

export function useNotificationPreferences(userId: string | undefined) {
  return useQuery({
    queryKey: ['notification_preferences', userId],
    enabled: !!userId,
    queryFn: async (): Promise<NotificationPreferences | null> => {
      const { data, error } = await createClient()
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdatePreferences(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: TablesUpdate<'notification_preferences'>) => {
      if (!userId) throw new Error('Not signed in');
      const { error } = await createClient()
        .from('notification_preferences')
        .upsert({ user_id: userId, ...patch, updated_at: new Date().toISOString() });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notification_preferences'] }),
  });
}

// Messages and notifications for the car-owner / fleet side. Mirrors the web's
// src/lib/messages/queries.ts and src/lib/notifications/queries.ts.
import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { currentUserId, supabase } from './supabase';
import type { PickedPhoto } from './queries';
import type { Tables } from '@/shared/database';

// ---------------------------------------------------------------- messages
export type Conversation = Tables<'conversations'> & {
  garages: { name: string; slug: string } | null;
  service_requests: { title: string } | null;
};
export type Message = Tables<'messages'>;
const CONVERSATION_SELECT = '*, garages(name, slug), service_requests(title)';

// RLS also shows garage owners their garages' threads, so "my conversations" scopes to the customer.
export function useConversations() {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: async (): Promise<Conversation[]> => {
      const { data, error } = await supabase
        .from('conversations')
        .select(CONVERSATION_SELECT)
        .eq('customer_id', await currentUserId())
        .order('last_message_at', { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data as unknown as Conversation[];
    },
  });
}

export function useConversation(id: string) {
  return useQuery({
    queryKey: ['conversations', id],
    queryFn: async (): Promise<Conversation> => {
      const { data, error } = await supabase.from('conversations').select(CONVERSATION_SELECT).eq('id', id).single();
      if (error) throw error;
      return data as unknown as Conversation;
    },
  });
}

/** Unread incoming messages per conversation. */
export function useUnreadCounts() {
  return useQuery({
    queryKey: ['messages', 'unread'],
    queryFn: async (): Promise<Map<string, number>> => {
      const { data, error } = await supabase
        .from('messages')
        .select('conversation_id')
        .is('read_at', null)
        .neq('sender_id', await currentUserId());
      if (error) throw error;
      const counts = new Map<string, number>();
      for (const m of data) counts.set(m.conversation_id, (counts.get(m.conversation_id) ?? 0) + 1);
      return counts;
    },
  });
}

export function useMessages(conversationId: string) {
  return useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async (): Promise<Message[]> => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at');
      if (error) throw error;
      return data;
    },
  });
}

/** Live feed for one conversation; RLS scopes what is delivered. */
export function useRealtimeMessages(conversationId: string) {
  const qc = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        () => {
          qc.invalidateQueries({ queryKey: ['messages'] });
          qc.invalidateQueries({ queryKey: ['conversations'] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, qc]);
}

/** Find or create the thread for (request, customer, garage). */
export function useOpenConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ requestId, garageId }: { requestId: string; garageId: string }): Promise<string> => {
      const uid = await currentUserId();
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .eq('request_id', requestId)
        .eq('garage_id', garageId)
        .eq('customer_id', uid)
        .maybeSingle();
      if (existing) return existing.id;
      const { data, error } = await supabase
        .from('conversations')
        .insert({ request_id: requestId, customer_id: uid, garage_id: garageId })
        .select('id')
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['conversations'] }),
  });
}

export const MAX_ATTACHMENT_MB = 10;

export function useSendMessage(conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ body, photo }: { body: string; photo: PickedPhoto | null }) => {
      const uid = await currentUserId();
      let attachmentPath: string | null = null;
      if (photo) {
        const ext = photo.fileName.includes('.') ? photo.fileName.slice(photo.fileName.lastIndexOf('.')) : '.jpg';
        attachmentPath = `${uid}/${conversationId}/${Math.random().toString(36).slice(2)}${Date.now()}${ext}`;
        const bytes = await (await fetch(photo.uri)).arrayBuffer();
        if (bytes.byteLength > MAX_ATTACHMENT_MB * 1024 * 1024) throw new Error('TOO_LARGE');
        const up = await supabase.storage.from('documents').upload(attachmentPath, bytes, { contentType: photo.mimeType });
        if (up.error) throw up.error;
      }
      const { error } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: uid,
        body: body || null,
        attachment_path: attachmentPath,
        attachment_type: attachmentPath ? 'image' : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['messages', conversationId] });
      qc.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

/** Mark incoming messages in a conversation as read (read receipts). */
export function useMarkRead(conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .neq('sender_id', await currentUserId())
        .is('read_at', null);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['messages', 'unread'] }),
  });
}

/** Time-limited link for a private attachment (the storage policy covers participants). */
export function useAttachmentUrl(path: string | null) {
  return useQuery({
    queryKey: ['attachment', path],
    enabled: !!path,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from('documents').createSignedUrl(path!, 60 * 10);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}

// ---------------------------------------------------------------- notifications
export type AppNotification = Tables<'notifications'>;

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: async (): Promise<AppNotification[]> => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', await currentUserId())
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: ['notifications', 'unread_count'],
    queryFn: async (): Promise<number> => {
      const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', await currentUserId())
        .is('read_at', null);
      if (error) throw error;
      return count ?? 0;
    },
  });
}

/** Keeps notification and message badges live while the app is open. */
export function useRealtimeInbox(userId: string | undefined) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`inbox-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => qc.invalidateQueries({ queryKey: ['notifications'] }),
      )
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        qc.invalidateQueries({ queryKey: ['messages', 'unread'] });
        qc.invalidateQueries({ queryKey: ['conversations'] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, qc]);
}

export function useMarkNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', await currentUserId())
        .is('read_at', null);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

/** In-app route for a notification (customer-side screens only), or null if it has none. */
export function notificationRoute(n: AppNotification): string | null {
  const data = (n.data ?? {}) as Record<string, string>;
  switch (n.type) {
    case 'new_quote':
    case 'quote_accepted':
    case 'quote_rejected':
    case 'job_completed':
      return data.request_id ? `/requests/${data.request_id}` : '/requests';
    case 'new_message':
      return data.conversation_id ? `/messages/${data.conversation_id}` : '/messages';
    default:
      return data.kind === 'vehicle_reminder' ? '/vehicles' : null;
  }
}

export type NotificationPreferences = Tables<'notification_preferences'>;

export function useNotificationPreferences() {
  return useQuery({
    queryKey: ['notification_preferences'],
    queryFn: async (): Promise<NotificationPreferences | null> => {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', await currentUserId())
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdatePreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Pick<NotificationPreferences, 'email_enabled' | 'sms_enabled' | 'in_app_enabled'>>) => {
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({ user_id: await currentUserId(), ...patch, updated_at: new Date().toISOString() });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notification_preferences'] }),
  });
}

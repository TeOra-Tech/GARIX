'use client';

import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/types/database';

export function useUserId() {
  return useQuery({
    queryKey: ['auth', 'user_id'],
    staleTime: Infinity,
    queryFn: async (): Promise<string | null> => {
      const {
        data: { user },
      } = await createClient().auth.getUser();
      return user?.id ?? null;
    },
  });
}

export type Conversation = Tables<'conversations'> & {
  garages: { name: string; slug: string; owner_id: string } | null;
  customer: { full_name: string } | null;
  service_requests: { title: string } | null;
};

export type Message = Tables<'messages'>;

const CONVERSATION_SELECT =
  '*, garages(name, slug, owner_id), customer:user_profiles!conversations_customer_id_fkey(full_name), service_requests(title)';

export function useConversations(garageId?: string) {
  return useQuery({
    queryKey: garageId ? ['conversations', 'garage', garageId] : ['conversations'],
    queryFn: async (): Promise<Conversation[]> => {
      let query = createClient()
        .from('conversations')
        .select(CONVERSATION_SELECT)
        .order('last_message_at', { ascending: false, nullsFirst: false });
      if (garageId) query = query.eq('garage_id', garageId);
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as Conversation[];
    },
  });
}

export function useConversation(id: string) {
  return useQuery({
    queryKey: ['conversations', id],
    queryFn: async (): Promise<Conversation> => {
      const { data, error } = await createClient()
        .from('conversations')
        .select(CONVERSATION_SELECT)
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as unknown as Conversation;
    },
  });
}

/** Unread incoming messages per conversation for the badge column. */
export function useUnreadCounts(userId: string | undefined) {
  return useQuery({
    queryKey: ['messages', 'unread', userId],
    enabled: !!userId,
    queryFn: async (): Promise<Map<string, number>> => {
      const { data, error } = await createClient()
        .from('messages')
        .select('conversation_id')
        .is('read_at', null)
        .neq('sender_id', userId!);
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
      const { data, error } = await createClient()
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at');
      if (error) throw error;
      return data;
    },
  });
}

/** Live INSERT/UPDATE feed for one conversation — RLS scopes delivery. */
export function useRealtimeMessages(conversationId: string) {
  const qc = useQueryClient();
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        () => {
          qc.invalidateQueries({ queryKey: ['messages', conversationId] });
          qc.invalidateQueries({ queryKey: ['conversations'] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, qc]);
}

/** Find or create the conversation for (request, customer, garage) and return its id. */
export function useOpenConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ requestId, garageId }: { requestId: string; garageId: string }): Promise<string> => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in');

      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .eq('request_id', requestId)
        .eq('garage_id', garageId)
        .eq('customer_id', user.id)
        .maybeSingle();
      if (existing) return existing.id;

      const { data, error } = await supabase
        .from('conversations')
        .insert({ request_id: requestId, customer_id: user.id, garage_id: garageId })
        .select('id')
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['conversations'] }),
  });
}

const MAX_ATTACHMENT_MB = 10;

export function useSendMessage(conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ body, file }: { body: string; file: File | null }) => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in');

      let attachmentPath: string | null = null;
      let attachmentType: 'image' | 'document' | null = null;
      if (file) {
        if (file.size > MAX_ATTACHMENT_MB * 1024 * 1024) {
          throw new Error(`Attachments must be under ${MAX_ATTACHMENT_MB} MB`);
        }
        const ext = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')) : '';
        attachmentPath = `${user.id}/${conversationId}/${crypto.randomUUID()}${ext}`;
        const up = await supabase.storage.from('documents').upload(attachmentPath, file);
        if (up.error) throw up.error;
        attachmentType = file.type.startsWith('image/') ? 'image' : 'document';
      }

      const { error } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: user.id,
        body: body || null,
        attachment_path: attachmentPath,
        attachment_type: attachmentType,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['messages', conversationId] });
      qc.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

/** Mark all incoming messages in a conversation as read. */
export function useMarkRead(conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await createClient()
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .neq('sender_id', userId)
        .is('read_at', null);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['messages'] }),
  });
}

/** Time-limited link for a private attachment (policy covers participants). */
export async function attachmentUrl(path: string): Promise<string> {
  const { data, error } = await createClient()
    .storage.from('documents')
    .createSignedUrl(path, 60 * 10);
  if (error) throw error;
  return data.signedUrl;
}

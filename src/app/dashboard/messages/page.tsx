'use client';

import Link from 'next/link';
import { useConversations, useUnreadCounts, useUserId, type Conversation } from '@/lib/messages/queries';
import { cn } from '@/lib/utils';

function counterpartName(c: Conversation, userId: string | null): string {
  return c.customer_id === userId ? (c.garages?.name ?? 'Garage') : (c.customer?.full_name || 'Customer');
}

function relativeTime(iso: string | null): string {
  if (!iso) return '';
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  if (mins < 60 * 24) return `${Math.floor(mins / 60)}h`;
  return new Date(iso).toLocaleDateString('en-IE', { day: 'numeric', month: 'short' });
}

export default function MessagesPage() {
  const userId = useUserId();
  const conversations = useConversations();
  const unread = useUnreadCounts(userId.data ?? undefined);

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-display text-3xl font-bold">Messages</h1>

      {conversations.isPending && <p className="mt-8 text-paper/60">Loading conversations…</p>}
      {conversations.isError && (
        <p role="alert" className="mt-8 text-danger">Could not load your messages. Refresh to try again.</p>
      )}
      {conversations.data?.length === 0 && (
        <div className="mt-8 rounded-hex border border-ink-line bg-ink-soft p-8 text-center">
          <p className="text-paper/70">No conversations yet.</p>
          <p className="mt-2 text-sm text-paper/50">
            Open one from a quote on any of your repair requests — or, for garages, reply when a customer messages you.
          </p>
        </div>
      )}

      <ul className="mt-6 divide-y divide-ink-line rounded-hex border border-ink-line bg-ink-soft">
        {conversations.data?.map((c) => {
          const unreadCount = unread.data?.get(c.id) ?? 0;
          return (
            <li key={c.id}>
              <Link
                href={`/dashboard/messages/${c.id}`}
                className="flex items-center gap-4 p-5 transition hover:bg-volt/5"
              >
                <div
                  aria-hidden
                  className="flex h-11 w-11 shrink-0 items-center justify-center hex-clip bg-volt/20 font-display font-bold text-volt-bright"
                >
                  {counterpartName(c, userId.data ?? null).charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={cn('truncate', unreadCount > 0 ? 'font-semibold' : 'font-medium')}>
                    {counterpartName(c, userId.data ?? null)}
                  </p>
                  <p className="truncate text-sm text-paper/50">
                    {c.service_requests?.title ?? 'General enquiry'}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-xs text-paper/40">{relativeTime(c.last_message_at)}</span>
                  {unreadCount > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-volt px-1.5 text-xs font-semibold text-white">
                      {unreadCount}
                    </span>
                  )}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}

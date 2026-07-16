'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useConversations, useUnreadCounts, useUserId } from '@/lib/messages/queries';
import { cn } from '@/lib/utils';

function relativeTime(iso: string | null): string {
  if (!iso) return '';
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  if (mins < 60 * 24) return `${Math.floor(mins / 60)}h`;
  return new Date(iso).toLocaleDateString('en-IE', { day: 'numeric', month: 'short' });
}

export default function GarageMessagesPage() {
  const { id } = useParams<{ id: string }>();
  const userId = useUserId();
  const conversations = useConversations(id);
  const unread = useUnreadCounts(userId.data ?? undefined);

  return (
    <section className="py-8">
      <h2 className="font-display text-2xl font-bold">Messages</h2>
      <p className="mt-1 text-sm text-paper/60">Conversations with this garage&rsquo;s customers.</p>

      {conversations.isPending && <p className="mt-6 text-paper/60">Loading conversations…</p>}
      {conversations.isError && (
        <p role="alert" className="mt-6 text-danger">Could not load messages. Refresh to try again.</p>
      )}
      {conversations.data?.length === 0 && (
        <p className="mt-6 rounded-hex border border-ink-line bg-ink-soft p-8 text-center text-paper/60">
          No conversations yet — customers can message you from their quotes.
        </p>
      )}

      {!!conversations.data?.length && (
        <ul className="mt-6 divide-y divide-ink-line rounded-hex border border-ink-line bg-ink-soft">
          {conversations.data.map((c) => {
            const unreadCount = unread.data?.get(c.id) ?? 0;
            const name = c.customer?.full_name || 'Customer';
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
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={cn('truncate', unreadCount > 0 ? 'font-semibold' : 'font-medium')}>{name}</p>
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
      )}
    </section>
  );
}

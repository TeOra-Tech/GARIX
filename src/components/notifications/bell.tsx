'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useUserId } from '@/lib/messages/queries';
import {
  notificationHref,
  useMarkAllNotificationsRead,
  useNotifications,
  useRealtimeNotifications,
  useUnreadNotificationCount,
} from '@/lib/notifications/queries';
import { cn } from '@/lib/utils';

function relativeTime(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 60 * 24) return `${Math.floor(mins / 60)}h ago`;
  return new Date(iso).toLocaleDateString('en-IE', { day: 'numeric', month: 'short' });
}

export function NotificationBell() {
  const userId = useUserId();
  const uid = userId.data ?? undefined;
  const notifications = useNotifications(uid);
  const unread = useUnreadNotificationCount(uid);
  const markAll = useMarkAllNotificationsRead();
  useRealtimeNotifications(uid);

  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!panelRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!uid) return null;
  const unreadCount = unread.data ?? 0;

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        aria-expanded={open}
        className="relative rounded-lg border border-ink-line p-2.5 transition hover:border-volt"
        onClick={() => setOpen((o) => !o)}
      >
        <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-signal px-1 text-[11px] font-bold text-ink">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-80 rounded-hex border border-ink-line bg-ink-soft shadow-xl">
          <div className="flex items-center justify-between border-b border-ink-line px-4 py-3">
            <p className="font-display font-semibold">Notifications</p>
            <div className="flex items-center gap-3 text-xs">
              {unreadCount > 0 && (
                <button type="button" className="text-volt-bright hover:underline" onClick={() => markAll.mutate()}>
                  Mark all read
                </button>
              )}
              <Link href="/dashboard/notifications" className="text-paper/50 hover:text-paper" onClick={() => setOpen(false)}>
                Settings
              </Link>
            </div>
          </div>
          <ul className="max-h-96 overflow-y-auto">
            {notifications.data?.length === 0 && (
              <li className="p-6 text-center text-sm text-paper/40">Nothing yet.</li>
            )}
            {notifications.data?.map((n) => (
              <li key={n.id} className="border-b border-ink-line/50 last:border-0">
                <Link
                  href={notificationHref(n)}
                  className={cn('block px-4 py-3 transition hover:bg-volt/5', !n.read_at && 'bg-volt/10')}
                  onClick={() => setOpen(false)}
                >
                  <p className={cn('text-sm', !n.read_at && 'font-semibold')}>{n.title}</p>
                  {n.body && <p className="mt-0.5 line-clamp-2 text-xs text-paper/60">{n.body}</p>}
                  <p className="mt-1 text-[11px] text-paper/40">{relativeTime(n.created_at)}</p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

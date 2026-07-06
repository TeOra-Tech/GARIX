'use client';

import { useUserId } from '@/lib/messages/queries';
import { useNotificationPreferences, useUpdatePreferences } from '@/lib/notifications/queries';

const CHANNELS = [
  {
    key: 'in_app_enabled' as const,
    label: 'In-app',
    description: 'The bell in your dashboard — quotes, messages, and account activity.',
  },
  {
    key: 'email_enabled' as const,
    label: 'Email',
    description: 'A copy of important notifications to your email address.',
  },
  {
    key: 'sms_enabled' as const,
    label: 'SMS',
    description: 'Text messages for time-sensitive updates. Standard rates may apply.',
  },
];

export default function NotificationPreferencesPage() {
  const userId = useUserId();
  const prefs = useNotificationPreferences(userId.data ?? undefined);
  const update = useUpdatePreferences(userId.data ?? undefined);

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-display text-3xl font-bold">Notification preferences</h1>
      <p className="mt-2 text-paper/60">Choose how Garix reaches you.</p>

      {prefs.isPending && <p className="mt-8 text-paper/60">Loading…</p>}

      {prefs.isSuccess && (
        <div className="mt-8 divide-y divide-ink-line rounded-hex border border-ink-line bg-ink-soft">
          {CHANNELS.map((c) => {
            const enabled = prefs.data?.[c.key] ?? (c.key !== 'sms_enabled');
            return (
              <label key={c.key} className="flex cursor-pointer items-start justify-between gap-4 p-5">
                <span>
                  <span className="block font-medium">{c.label}</span>
                  <span className="mt-0.5 block text-sm text-paper/60">{c.description}</span>
                </span>
                <input
                  type="checkbox"
                  className="mt-1 h-5 w-5 accent-volt"
                  checked={enabled}
                  disabled={update.isPending}
                  onChange={(e) => update.mutate({ [c.key]: e.target.checked })}
                />
              </label>
            );
          })}
        </div>
      )}

      {update.isError && (
        <p role="alert" className="mt-4 text-sm text-signal">Could not save — try again.</p>
      )}
      {update.isSuccess && !update.isPending && (
        <p className="mt-4 text-sm text-volt-bright" role="status">Saved.</p>
      )}
    </main>
  );
}

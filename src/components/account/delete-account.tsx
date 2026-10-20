'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { BLOCKER_COPY, isDeletionBlocker, type DeletionBlocker } from '@/lib/account/deletion';
import { Field, inputCls } from '@/components/auth/field';

function useDeletionBlockers(enabled: boolean) {
  return useQuery({
    queryKey: ['account_deletion_blockers'],
    enabled,
    queryFn: async () => {
      const { data, error } = await createClient().rpc('account_deletion_blockers');
      if (error) throw error;
      return (data ?? []).filter(isDeletionBlocker);
    },
  });
}

/** "Delete account" section for /dashboard/account. */
export function DeleteAccountSection({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');
  const blockers = useDeletionBlockers(open);
  const [serverBlockers, setServerBlockers] = useState<DeletionBlocker[]>([]);

  const remove = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmEmail }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; blockers?: string[] };
      if (res.status === 409 && body.blockers) {
        setServerBlockers(body.blockers.filter(isDeletionBlocker));
        throw new Error('BLOCKED');
      }
      if (!res.ok) throw new Error(body.error ?? 'DELETE_FAILED');
    },
    onSuccess: () => window.location.replace('/account-deleted'),
  });

  const activeBlockers = serverBlockers.length ? serverBlockers : (blockers.data ?? []);
  const emailMatches = confirmEmail.trim().toLowerCase() === email.toLowerCase();

  return (
    <section className="mt-6 rounded-hex border border-danger/40 bg-ink-soft p-6" aria-labelledby="delete-account-title">
      <h2 id="delete-account-title" className="font-display text-lg font-semibold">Delete account</h2>
      <p className="mt-2 text-sm text-paper/70">
        Permanently delete your Garix account and the personal data linked to it. This can&rsquo;t be undone.
      </p>

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-4 inline-flex rounded-lg border border-danger px-4 py-2 text-sm font-semibold text-danger transition hover:bg-danger/10"
        >
          Delete my account
        </button>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="text-sm text-paper/80">
            <p className="font-semibold">What we delete</p>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>Your profile, addresses and notification settings</li>
              <li>Your vehicles, service history and reminders</li>
              <li>Your repair requests, photos, quotes received, messages and reviews</li>
            </ul>
            <p className="mt-3 font-semibold">What we keep</p>
            <p className="mt-1">
              Records we&rsquo;re legally required to hold, such as payment and tax records (6 years), with your
              name removed where possible. See our{' '}
              <Link href="/legal/privacy" className="font-medium text-navy underline underline-offset-2">
                privacy policy
              </Link>
              .
            </p>
          </div>

          {blockers.isPending && <p className="text-sm text-paper/70">Checking your account…</p>}
          {blockers.isError && (
            <p role="alert" className="text-sm text-danger">Could not check your account. Refresh to try again.</p>
          )}

          {activeBlockers.length > 0 ? (
            <div role="alert" className="rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm">
              <p className="font-semibold">Before you can delete your account</p>
              <ul className="mt-2 space-y-2">
                {activeBlockers.map((b) => (
                  <li key={b}>
                    {BLOCKER_COPY[b].text}{' '}
                    {BLOCKER_COPY[b].href && (
                      <Link href={BLOCKER_COPY[b].href!} className="font-medium text-navy underline underline-offset-2">
                        {BLOCKER_COPY[b].link}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            blockers.isSuccess && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (emailMatches) remove.mutate();
                }}
                className="space-y-4"
                noValidate
              >
                <Field label={`Type your email (${email}) to confirm`} htmlFor="delete-confirm-email">
                  <input
                    id="delete-confirm-email"
                    type="email"
                    autoComplete="off"
                    className={inputCls}
                    value={confirmEmail}
                    onChange={(e) => setConfirmEmail(e.target.value)}
                  />
                </Field>
                {remove.isError && remove.error.message !== 'BLOCKED' && (
                  <p role="alert" className="text-sm text-danger">
                    We couldn&rsquo;t delete your account. Try again, or email privacy@garix.ie.
                  </p>
                )}
                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={!emailMatches || remove.isPending}
                    className="inline-flex rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-white transition hover:bg-danger/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {remove.isPending ? 'Deleting…' : 'Permanently delete account'}
                  </button>
                  <button type="button" onClick={() => setOpen(false)} className="btn-ghost !px-4 !py-2 text-sm">
                    Cancel
                  </button>
                </div>
              </form>
            )
          )}
        </div>
      )}
    </section>
  );
}

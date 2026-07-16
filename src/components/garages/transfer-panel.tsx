'use client';

import { useState } from 'react';
import {
  useCancelGarageTransfer,
  useGarageTransfers,
  useInitiateGarageTransfer,
} from '@/lib/garages/portal';
import { transferSchema } from '@/lib/validation/vehicle-care';
import { Field, inputCls } from '@/components/auth/field';

/** Owner-side: hand the garage (wallet, reviews, history) to a new owner. */
export function GarageTransferPanel({ garageId }: { garageId: string }) {
  const transfers = useGarageTransfers();
  const initiate = useInitiateGarageTransfer(garageId);
  const cancel = useCancelGarageTransfer();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const pending = transfers.data?.rows.find(
    (t) => t.garage_id === garageId && t.status === 'pending' && t.from_user_id === transfers.data.userId,
  );

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = transferSchema.safeParse({ toEmail: email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Enter a valid email');
      return;
    }
    setError(null);
    initiate.mutate(parsed.data.toEmail, { onSuccess: () => setSent(true) });
  }

  return (
    <section aria-labelledby="garage-transfer-heading" className="mt-12 rounded-hex border border-ink-line bg-ink-soft p-6">
      <h2 id="garage-transfer-heading" className="font-display text-xl font-bold">
        Transfer ownership
      </h2>
      <p className="mt-1 text-sm text-paper/60">
        Selling the business? Transfer this garage to the new owner&rsquo;s Garix account. The
        credit wallet, reviews, quotes and job history all stay with the garage. The new owner
        must accept before anything changes.
      </p>

      {pending ? (
        <div className="mt-4 rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm">
          <p>
            Transfer pending — waiting for the new owner to accept{' '}
            <span className="font-semibold">{pending.garage_label}</span>.
          </p>
          <button
            type="button"
            className="btn-ghost mt-3 !px-4 !py-2 text-sm"
            disabled={cancel.isPending}
            onClick={() => cancel.mutate(pending.id)}
          >
            {cancel.isPending ? 'Cancelling…' : 'Cancel transfer'}
          </button>
        </div>
      ) : sent ? (
        <p className="mt-4 rounded-lg border border-success/40 bg-success/10 p-4 text-sm">
          Transfer offer sent — the new owner has been notified and can accept it from their
          dashboard.
        </p>
      ) : (
        <form onSubmit={submit} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end" noValidate>
          <div className="flex-1">
            <Field label="New owner’s email (their Garix account)" htmlFor="gtr-email" error={error ?? undefined}>
              <input
                id="gtr-email"
                type="email"
                className={inputCls}
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
          </div>
          <button type="submit" className="btn-primary shrink-0" disabled={initiate.isPending}>
            {initiate.isPending ? 'Sending…' : 'Offer transfer'}
          </button>
        </form>
      )}
      {initiate.isError && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {initiate.error instanceof Error ? initiate.error.message : 'Could not start the transfer.'}
        </p>
      )}
    </section>
  );
}

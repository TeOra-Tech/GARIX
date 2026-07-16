'use client';

import { useGarageTransfers, useRespondGarageTransfer } from '@/lib/garages/portal';

/** Pending incoming garage-ownership offers — accept or decline. */
export function GarageTransferInbox() {
  const transfers = useGarageTransfers();
  const respond = useRespondGarageTransfer();

  const incoming =
    transfers.data?.rows.filter(
      (t) => t.status === 'pending' && t.to_user_id === transfers.data.userId,
    ) ?? [];
  if (!incoming.length) return null;

  return (
    <section aria-label="Garage ownership offers" className="space-y-3">
      {incoming.map((t) => (
        <div key={t.id} className="rounded-hex border border-gold/50 bg-gold/10 p-4">
          <p className="text-sm">
            <span className="font-semibold">{t.garage_label}</span> — the current owner wants to
            transfer this garage to you, including its credit wallet, reviews and job history.
          </p>
          <div className="mt-3 flex gap-3">
            <button
              type="button"
              className="btn-primary !px-4 !py-2 text-sm"
              disabled={respond.isPending}
              onClick={() => respond.mutate({ transferId: t.id, accept: true })}
            >
              Accept ownership
            </button>
            <button
              type="button"
              className="btn-ghost !px-4 !py-2 text-sm"
              disabled={respond.isPending}
              onClick={() => respond.mutate({ transferId: t.id, accept: false })}
            >
              Decline
            </button>
          </div>
          {respond.isError && (
            <p role="alert" className="mt-2 text-sm text-danger">
              {respond.error instanceof Error ? respond.error.message : 'Could not respond to the transfer.'}
            </p>
          )}
        </div>
      ))}
    </section>
  );
}

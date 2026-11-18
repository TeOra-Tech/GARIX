'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  DELETABLE_REQUEST_STATUSES,
  EDITABLE_REQUEST_STATUSES,
  requestActionError,
  useDeleteRequest,
} from '@/lib/requests/queries';

/** Edit / delete controls on the customer's request page. */
export function RequestActions({ requestId, status, quoteCount }: { requestId: string; status: string; quoteCount: number }) {
  const router = useRouter();
  const remove = useDeleteRequest(requestId);
  const [confirming, setConfirming] = useState(false);
  const canEdit = (EDITABLE_REQUEST_STATUSES as readonly string[]).includes(status);
  const canDelete = (DELETABLE_REQUEST_STATUSES as readonly string[]).includes(status);
  if (!canEdit && !canDelete) return null;

  const hasQuotes = quoteCount > 0;

  return (
    <div className="mt-4">
      {!confirming ? (
        <div className="flex flex-wrap gap-3">
          {canEdit && (
            <Link href={`/dashboard/requests/${requestId}/edit`} className="btn-ghost !px-4 !py-2 text-sm">
              Edit request
            </Link>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="inline-flex rounded-lg border border-danger px-4 py-2 text-sm font-semibold text-danger transition hover:bg-danger/10"
            >
              {hasQuotes ? 'Cancel request' : 'Delete request'}
            </button>
          )}
        </div>
      ) : (
        <div role="alertdialog" aria-labelledby="delete-request-title" className="rounded-lg border border-danger/40 bg-danger/5 p-4 text-sm">
          <p id="delete-request-title" className="font-semibold">
            {hasQuotes ? 'Cancel this request?' : 'Delete this request?'}
          </p>
          <p className="mt-1 text-paper/80">
            {hasQuotes
              ? 'Garages have already quoted, so the request will be closed rather than erased. We’ll let them know, and the quotes stay in your history.'
              : 'The request and its photos will be permanently deleted. This can’t be undone.'}
          </p>
          {remove.isError && <p role="alert" className="mt-2 text-danger">{requestActionError(remove.error)}</p>}
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={remove.isPending}
              onClick={() =>
                remove.mutate(undefined, {
                  onSuccess: (outcome) => {
                    setConfirming(false);
                    if (outcome === 'deleted') router.replace('/dashboard/requests?deleted=1');
                  },
                })
              }
              className="inline-flex rounded-lg bg-danger px-4 py-2 font-semibold text-white transition hover:bg-danger/90 disabled:opacity-50"
            >
              {remove.isPending ? 'Working…' : hasQuotes ? 'Yes, cancel it' : 'Yes, delete it'}
            </button>
            <button type="button" onClick={() => setConfirming(false)} className="btn-ghost !px-4 !py-2">
              Keep it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

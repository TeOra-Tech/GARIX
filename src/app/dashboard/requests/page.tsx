'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMyRequests } from '@/lib/requests/queries';
import { URGENCY_LABELS } from '@/lib/validation/request';
import { formatEur } from '@/lib/vat';
import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<string, string> = {
  open: 'border-volt/50 text-volt-bright',
  quoted: 'border-signal/50 text-signal-soft',
  accepted: 'border-volt/50 text-volt-bright',
  in_progress: 'border-signal/50 text-signal-soft',
  completed: 'border-ink-line text-paper/60',
  cancelled: 'border-ink-line text-paper/40',
  expired: 'border-ink-line text-paper/40',
};

function RequestsList() {
  const params = useSearchParams();
  const posted = params.get('posted') === '1';
  const attachmentsFailed = params.get('attachments') === 'failed';
  const requests = useMyRequests();

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold">My requests</h1>
        <Link href="/requests/new" className="btn-primary !px-4 !py-2 text-sm">
          New request
        </Link>
      </div>

      {posted && (
        <p className="mt-6 rounded-lg border border-volt/40 bg-volt/10 p-4 text-sm">
          Your request is live. Garages in your area can now see it and send quotes —
          we&rsquo;ll notify you when the first one lands.
          {attachmentsFailed && (
            <span className="mt-1 block text-signal-soft">
              Some attachments didn&rsquo;t upload — you can re-add them later.
            </span>
          )}
        </p>
      )}

      {requests.isPending && <p className="mt-8 text-paper/60">Loading your requests…</p>}
      {requests.isError && (
        <p role="alert" className="mt-8 text-signal">Could not load your requests. Refresh to try again.</p>
      )}
      {requests.data?.length === 0 && (
        <div className="mt-8 rounded-hex border border-ink-line bg-ink-soft p-8 text-center">
          <p className="text-paper/70">No repair requests yet.</p>
          <Link href="/requests/new" className="btn-primary mt-6 inline-flex">
            Post your first request
          </Link>
        </div>
      )}
      {!!requests.data?.length && (
        <ul className="mt-8 space-y-4">
          {requests.data.map((r) => {
            const vehicleName = [
              r.vehicles?.vehicle_makes?.name ?? r.vehicles?.make_text,
              r.vehicles?.vehicle_models?.name,
            ]
              .filter(Boolean)
              .join(' ');
            return (
              <li key={r.id} className="rounded-hex border border-ink-line bg-ink-soft p-6">
                <div className="flex items-start justify-between gap-4">
                  <h2 className="font-display text-lg font-semibold">{r.title}</h2>
                  <span
                    className={cn(
                      'shrink-0 rounded-full border px-3 py-1 text-xs',
                      STATUS_STYLES[r.status] ?? 'border-ink-line text-paper/60',
                    )}
                  >
                    {r.status.replace('_', ' ')}
                  </span>
                </div>
                <p className="mt-2 text-sm text-paper/60">
                  {[
                    vehicleName && `${vehicleName} (${r.vehicles?.registration_number})`,
                    URGENCY_LABELS[r.urgency],
                    `${r.location_town}, Co. ${r.location_county}`,
                    r.budget_amount != null && `Budget ${formatEur(Number(r.budget_amount))}`,
                    r.request_attachments.length > 0 &&
                      `${r.request_attachments.length} attachment${r.request_attachments.length > 1 ? 's' : ''}`,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                <p className="mt-2 text-xs text-paper/40">
                  Posted {new Date(r.created_at).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {' · '}expires {new Date(r.expires_at).toLocaleDateString('en-IE', { day: 'numeric', month: 'short' })}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}

export default function Page() {
  return (
    <Suspense>
      <RequestsList />
    </Suspense>
  );
}

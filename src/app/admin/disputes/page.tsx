'use client';

import { useState } from 'react';
import { useAdminDisputes, useResolveDispute, type AdminDispute } from '@/lib/admin/queries';
import { inputCls } from '@/components/auth/field';
import { cn } from '@/lib/utils';

function DisputeCard({ dispute }: { dispute: AdminDispute }) {
  const resolve = useResolveDispute();
  const [resolution, setResolution] = useState('');
  const open = dispute.status === 'open' || dispute.status === 'investigating';

  return (
    <li className="rounded-hex border border-ink-line bg-ink-soft p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-display font-semibold">{dispute.service_requests?.title ?? 'Request removed'}</p>
        <span className={cn(
          'rounded-full border px-3 py-1 text-xs',
          open ? 'border-signal/50 text-signal-soft' : 'border-ink-line text-paper/40',
        )}>
          {dispute.status}
        </span>
      </div>
      <p className="mt-1 text-xs text-paper/40">
        Opened by {dispute.opener?.full_name ?? 'user'} ·{' '}
        {new Date(dispute.created_at).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' })}
      </p>
      <p className="mt-3 text-sm text-paper/80">{dispute.reason}</p>
      {dispute.resolution && (
        <p className="mt-2 border-l-2 border-volt pl-3 text-sm text-paper/60">Resolution: {dispute.resolution}</p>
      )}

      {open && (
        <div className="mt-4 space-y-2">
          {dispute.status === 'open' && (
            <button type="button" className="btn-ghost !px-4 !py-2 text-sm" disabled={resolve.isPending}
              onClick={() => resolve.mutate({ disputeId: dispute.id, status: 'investigating' })}>
              Mark investigating
            </button>
          )}
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (resolution.trim().length < 3) return;
              resolve.mutate({ disputeId: dispute.id, status: 'resolved', resolution: resolution.trim() });
            }}
          >
            <input aria-label="Resolution" className={cn(inputCls, '!w-72 !px-3 !py-2 text-sm')}
              placeholder="Resolution summary" value={resolution} onChange={(e) => setResolution(e.target.value)} />
            <button type="submit" className="btn-primary !px-4 !py-2 text-sm" disabled={resolve.isPending}>
              Resolve
            </button>
          </form>
          {resolve.isError && <p role="alert" className="text-sm text-danger">Update failed.</p>}
        </div>
      )}
    </li>
  );
}

export default function AdminDisputesPage() {
  const disputes = useAdminDisputes();
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-3xl font-bold">Disputes</h1>
      {disputes.isPending && <p className="mt-8 text-paper/60">Loading…</p>}
      {disputes.data?.length === 0 && <p className="mt-8 text-paper/60">No disputes — long may it last.</p>}
      <ul className="mt-6 space-y-4">
        {disputes.data?.map((d) => <DisputeCard key={d.id} dispute={d} />)}
      </ul>
    </main>
  );
}

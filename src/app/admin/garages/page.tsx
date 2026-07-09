'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  useAdminGarages,
  useAdjustCredits,
  useGarageStatusAction,
  type AdminGarage,
} from '@/lib/admin/queries';
import { inputCls } from '@/components/auth/field';
import { cn } from '@/lib/utils';

const FILTERS = [
  { value: null, label: 'All' },
  { value: 'pending_verification', label: 'Pending' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'rejected', label: 'Rejected' },
];

function CreditAdjuster({ garage }: { garage: AdminGarage }) {
  const adjust = useAdjustCredits();
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  return (
    <form
      className="mt-3 flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const n = Number(amount);
        if (!Number.isInteger(n) || n === 0 || reason.trim().length < 3) return;
        adjust.mutate(
          { garageId: garage.id, amount: n, reason: reason.trim() },
          { onSuccess: () => { setAmount(''); setReason(''); } },
        );
      }}
    >
      <input aria-label={`Credit adjustment for ${garage.name}`} inputMode="numeric" placeholder="+/- credits"
        className={cn(inputCls, '!w-28 !px-3 !py-2 text-sm')} value={amount} onChange={(e) => setAmount(e.target.value)} />
      <input aria-label="Reason" placeholder="Reason (audited)"
        className={cn(inputCls, '!w-52 !px-3 !py-2 text-sm')} value={reason} onChange={(e) => setReason(e.target.value)} />
      <button type="submit" className="btn-ghost !px-3 !py-2 text-sm" disabled={adjust.isPending}>
        {adjust.isPending ? '…' : 'Adjust'}
      </button>
      {adjust.isError && (
        <span role="alert" className="text-xs text-danger">
          {adjust.error.message === 'BALANCE_WOULD_GO_NEGATIVE' ? 'Balance cannot go negative' : 'Failed'}
        </span>
      )}
    </form>
  );
}

function GaragesAdmin() {
  const params = useSearchParams();
  const [filter, setFilter] = useState<string | null>(params.get('status'));
  const garages = useAdminGarages(filter);
  const statusAction = useGarageStatusAction();

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-3xl font-bold">Garages</h1>

      <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Filter by status">
        {FILTERS.map((f) => (
          <button key={f.label} type="button" aria-pressed={filter === f.value}
            className={cn(
              'rounded-full border px-4 py-1.5 text-sm transition',
              filter === f.value ? 'border-volt bg-volt/15 text-volt-bright' : 'border-ink-line text-paper/60 hover:text-paper',
            )}
            onClick={() => setFilter(f.value)}>
            {f.label}
          </button>
        ))}
      </div>

      {garages.isPending && <p className="mt-8 text-paper/60">Loading…</p>}
      {garages.data?.length === 0 && <p className="mt-8 text-paper/60">No garages match.</p>}

      <ul className="mt-6 space-y-4">
        {garages.data?.map((g) => (
          <li key={g.id} className="rounded-hex border border-ink-line bg-ink-soft p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-display text-lg font-semibold">
                  {g.status === 'active' ? (
                    <Link href={`/garages/${g.slug}`} className="hover:text-volt-bright">{g.name}</Link>
                  ) : (
                    g.name
                  )}
                </p>
                <p className="mt-1 text-sm text-paper/60">
                  {g.user_profiles?.full_name} · {g.user_profiles?.email} · {g.phone}
                </p>
                <p className="mt-1 text-xs text-paper/40">
                  Registered {new Date(g.created_at).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {' · '}wallet {g.credit_wallets?.balance ?? 0} credits
                  {g.review_count > 0 && ` · ★ ${Number(g.avg_rating).toFixed(1)} (${g.review_count})`}
                </p>
              </div>
              <span className={cn(
                'rounded-full border px-3 py-1 text-xs',
                g.status === 'active' ? 'border-volt/50 text-volt-bright'
                  : g.status === 'pending_verification' || g.status === 'pending_approval' ? 'border-signal/50 text-signal-soft'
                  : 'border-ink-line text-paper/40',
              )}>
                {g.status.replace(/_/g, ' ')}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {g.status !== 'active' && (
                <button type="button" className="btn-primary !px-4 !py-2 text-sm" disabled={statusAction.isPending}
                  onClick={() => statusAction.mutate({ garageId: g.id, status: 'active' })}>
                  Approve
                </button>
              )}
              {(g.status === 'pending_verification' || g.status === 'pending_approval') && (
                <button type="button" className="btn-ghost !border-signal/50 !px-4 !py-2 text-sm text-signal-soft"
                  disabled={statusAction.isPending}
                  onClick={() => statusAction.mutate({ garageId: g.id, status: 'rejected' })}>
                  Reject
                </button>
              )}
              {g.status === 'active' && (
                <button type="button" className="btn-ghost !border-signal/50 !px-4 !py-2 text-sm text-signal-soft"
                  disabled={statusAction.isPending}
                  onClick={() => statusAction.mutate({ garageId: g.id, status: 'suspended' })}>
                  Suspend
                </button>
              )}
            </div>
            {statusAction.isError && (
              <p role="alert" className="mt-2 text-sm text-danger">Action failed — try again.</p>
            )}

            <CreditAdjuster garage={g} />
          </li>
        ))}
      </ul>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense>
      <GaragesAdmin />
    </Suspense>
  );
}

'use client';

import { useMemo, useState } from 'react';
import {
  useAdminFleetCandidates,
  useAdminGarages,
  useAdjustCredits,
  useGrantFleetTrial,
  useGrantGarageTrial,
  type AdminFleetCandidate,
  type AdminGarage,
} from '@/lib/admin/queries';
import { inputCls } from '@/components/auth/field';
import { cn } from '@/lib/utils';

function formatDate(d: string | null) {
  return d ? new Date(d).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
}

function trialError(msg: string | undefined) {
  if (!msg) return 'Failed — try again.';
  if (msg === 'HAS_STRIPE_SUBSCRIPTION') return 'This account has a paid Stripe subscription — cancel it in Stripe before granting a comp trial.';
  if (msg === 'NOT_A_CUSTOMER') return 'Only customer accounts can be made into fleets.';
  return 'Failed — try again.';
}

// ---------- garages ----------

function GarageGrantCard({ garage }: { garage: AdminGarage }) {
  const credits = useAdjustCredits();
  const trial = useGrantGarageTrial();
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [days, setDays] = useState('30');

  const sub = garage.garage_subscriptions;
  const compTrial = sub?.status === 'trialing' && !sub.stripe_subscription_id;
  const planLabel = compTrial
    ? `Pro — comp trial (ends ${formatDate(sub?.current_period_end ?? null)})`
    : garage.plan === 'pro'
      ? sub?.stripe_subscription_id
        ? 'Pro — paid'
        : 'Pro'
      : 'Basic';

  return (
    <li className="rounded-hex border border-ink-line bg-ink-soft p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-display text-lg font-semibold">{garage.name}</p>
          <p className="mt-1 text-sm text-paper/60">
            {garage.user_profiles?.full_name} · {garage.user_profiles?.email}
          </p>
          <p className="mt-1 text-xs text-paper/40">
            wallet {garage.credit_wallets?.balance ?? 0} credits · status {garage.status.replace(/_/g, ' ')}
          </p>
        </div>
        <span className={cn(
          'rounded-full border px-3 py-1 text-xs',
          garage.plan === 'pro' ? 'border-volt/50 text-volt-bright' : 'border-ink-line text-paper/50',
        )}>
          {planLabel}
        </span>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {/* Free credits */}
        <form
          className="rounded-lg border border-ink-line/60 p-3"
          onSubmit={(e) => {
            e.preventDefault();
            const n = Number(amount);
            if (!Number.isInteger(n) || n === 0 || reason.trim().length < 3) return;
            credits.mutate(
              { garageId: garage.id, amount: n, reason: reason.trim() },
              { onSuccess: () => { setAmount(''); setReason(''); } },
            );
          }}
        >
          <p className="text-sm font-medium">Grant free credits</p>
          <p className="text-xs text-paper/40">1 credit = €1. Use a negative amount to deduct.</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input aria-label={`Credit amount for ${garage.name}`} inputMode="numeric" placeholder="+ credits"
              className={cn(inputCls, '!w-24 !px-3 !py-2 text-sm')} value={amount} onChange={(e) => setAmount(e.target.value)} />
            <input aria-label="Reason" placeholder="Reason (audited)"
              className={cn(inputCls, '!w-40 !px-3 !py-2 text-sm')} value={reason} onChange={(e) => setReason(e.target.value)} />
            <button type="submit" className="btn-ghost !px-3 !py-2 text-sm" disabled={credits.isPending}>
              {credits.isPending ? '…' : 'Grant'}
            </button>
          </div>
          {credits.isError && (
            <p role="alert" className="mt-2 text-xs text-danger">
              {credits.error.message === 'BALANCE_WOULD_GO_NEGATIVE' ? 'Balance cannot go negative' : 'Failed'}
            </p>
          )}
          {credits.isSuccess && <p className="mt-2 text-xs text-volt-bright">Credits updated.</p>}
        </form>

        {/* Pro trial */}
        <form
          className="rounded-lg border border-ink-line/60 p-3"
          onSubmit={(e) => {
            e.preventDefault();
            const n = Number(days);
            if (!Number.isInteger(n) || n < 1 || n > 365) return;
            trial.mutate({ garageId: garage.id, days: n });
          }}
        >
          <p className="text-sm font-medium">Grant Pro trial</p>
          <p className="text-xs text-paper/40">Free Pro (unlimited quotes + all Pro tools). No card, auto-expires.</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input aria-label={`Trial length in days for ${garage.name}`} inputMode="numeric"
              className={cn(inputCls, '!w-20 !px-3 !py-2 text-sm')} value={days} onChange={(e) => setDays(e.target.value)} />
            <span className="text-sm text-paper/50">days</span>
            <button type="submit" className="btn-primary !px-3 !py-2 text-sm" disabled={trial.isPending}>
              {trial.isPending ? '…' : compTrial ? 'Extend trial' : 'Grant trial'}
            </button>
          </div>
          {trial.isError && <p role="alert" className="mt-2 text-xs text-danger">{trialError(trial.error.message)}</p>}
          {trial.isSuccess && <p className="mt-2 text-xs text-volt-bright">Pro trial active.</p>}
        </form>
      </div>
    </li>
  );
}

function GaragesPanel() {
  const garages = useAdminGarages(null);
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return garages.data ?? [];
    return (garages.data ?? []).filter(
      (g) =>
        g.name.toLowerCase().includes(s) ||
        g.user_profiles?.email?.toLowerCase().includes(s) ||
        g.user_profiles?.full_name?.toLowerCase().includes(s),
    );
  }, [garages.data, search]);

  return (
    <section>
      <h2 className="font-display text-2xl font-semibold">Garages</h2>
      <p className="mt-1 text-sm text-paper/50">Grant free credits or a free Pro trial.</p>
      <input
        aria-label="Search garages"
        placeholder="Search by garage name, owner or email…"
        className={cn(inputCls, 'mt-4 max-w-md')}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {garages.isPending && <p className="mt-6 text-paper/60">Loading garages…</p>}
      {garages.data && filtered.length === 0 && <p className="mt-6 text-paper/60">No garages match.</p>}
      <ul className="mt-4 space-y-4">
        {filtered.map((g) => <GarageGrantCard key={g.id} garage={g} />)}
      </ul>
    </section>
  );
}

// ---------- fleets ----------

function FleetGrantCard({ candidate }: { candidate: AdminFleetCandidate }) {
  const trial = useGrantFleetTrial();
  const [days, setDays] = useState('30');

  const sub = candidate.fleet_subscriptions;
  const compTrial = sub?.status === 'trialing' && !sub.stripe_subscription_id;
  const vehicles = candidate.vehicles?.[0]?.count ?? 0;
  const standingLabel = compTrial
    ? `Fleet — comp trial (ends ${formatDate(sub?.current_period_end ?? null)})`
    : candidate.account_type === 'fleet'
      ? sub?.status === 'active'
        ? 'Fleet — paid'
        : 'Fleet'
      : 'Individual';

  return (
    <li className="rounded-hex border border-ink-line bg-ink-soft p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-display text-lg font-semibold">{candidate.full_name || 'Unnamed'}</p>
          <p className="mt-1 text-sm text-paper/60">{candidate.email}</p>
          <p className="mt-1 text-xs text-paper/40">{vehicles} vehicle{vehicles === 1 ? '' : 's'}</p>
        </div>
        <span className={cn(
          'rounded-full border px-3 py-1 text-xs',
          candidate.account_type === 'fleet' ? 'border-volt/50 text-volt-bright' : 'border-ink-line text-paper/50',
        )}>
          {standingLabel}
        </span>
      </div>

      <form
        className="mt-4 rounded-lg border border-ink-line/60 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          const n = Number(days);
          if (!Number.isInteger(n) || n < 1 || n > 365) return;
          trial.mutate({ userId: candidate.id, days: n });
        }}
      >
        <p className="text-sm font-medium">Grant fleet trial</p>
        <p className="text-xs text-paper/40">Makes this a fleet account (unlimited vehicles) free for the trial period. No card, auto-expires.</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input aria-label={`Fleet trial length in days for ${candidate.email}`} inputMode="numeric"
            className={cn(inputCls, '!w-20 !px-3 !py-2 text-sm')} value={days} onChange={(e) => setDays(e.target.value)} />
          <span className="text-sm text-paper/50">days</span>
          <button type="submit" className="btn-primary !px-3 !py-2 text-sm" disabled={trial.isPending}>
            {trial.isPending ? '…' : compTrial ? 'Extend trial' : 'Grant trial'}
          </button>
        </div>
        {trial.isError && <p role="alert" className="mt-2 text-xs text-danger">{trialError(trial.error.message)}</p>}
        {trial.isSuccess && <p className="mt-2 text-xs text-volt-bright">Fleet trial active.</p>}
      </form>
    </li>
  );
}

function FleetsPanel() {
  const [search, setSearch] = useState('');
  const candidates = useAdminFleetCandidates(search);

  return (
    <section className="mt-12">
      <h2 className="font-display text-2xl font-semibold">Fleets</h2>
      <p className="mt-1 text-sm text-paper/50">Grant a customer a free fleet trial (unlimited vehicles, per-vehicle billing waived).</p>
      <input
        aria-label="Search customers"
        placeholder="Search customers by name or email…"
        className={cn(inputCls, 'mt-4 max-w-md')}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {candidates.isPending && <p className="mt-6 text-paper/60">Loading customers…</p>}
      {candidates.data?.length === 0 && <p className="mt-6 text-paper/60">No customers match.</p>}
      <ul className="mt-4 space-y-4">
        {candidates.data?.map((c) => <FleetGrantCard key={c.id} candidate={c} />)}
      </ul>
    </section>
  );
}

export default function GrantsAdminPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-3xl font-bold">Grants &amp; trials</h1>
      <p className="mt-2 text-sm text-paper/60">
        Comp free credits and trials. Every grant is written server-side and recorded in the audit log; trials carry no
        card and expire automatically.
      </p>
      <div className="mt-8">
        <GaragesPanel />
        <FleetsPanel />
      </div>
    </main>
  );
}

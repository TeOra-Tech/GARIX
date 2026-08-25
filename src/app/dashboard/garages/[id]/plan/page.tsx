'use client';

import { Suspense, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useOwnedGarage } from '@/lib/garages/portal';
import {
  BASIC_DAILY_QUOTE_LIMIT,
  PRO_PRICE_EUR,
  garagePlanIsPro,
  useGarageSubscription,
  useOpenGaragePortal,
  useReconcileGaragePlan,
  useStartProCheckout,
} from '@/lib/garage-plan/queries';
import { cn } from '@/lib/utils';

const PRO_FEATURES: { label: string; soon?: boolean }[] = [
  { label: 'Unlimited quotes (no per-quote credits)' },
  { label: 'Customer CRM' },
  { label: 'Review replies' },
  { label: 'Vehicle service history', soon: true },
  { label: 'Booking management', soon: true },
  { label: 'Automated reminders', soon: true },
  { label: 'Analytics dashboard', soon: true },
];

const STATUS_COPY: Record<string, { label: string; cls: string }> = {
  active: { label: 'Active', cls: 'border-success/50 bg-success/10 text-success' },
  trialing: { label: 'Trial', cls: 'border-info/50 bg-info/10 text-info' },
  past_due: { label: 'Payment failed', cls: 'border-danger/50 bg-danger/10 text-danger' },
  unpaid: { label: 'Unpaid', cls: 'border-danger/50 bg-danger/10 text-danger' },
  canceled: { label: 'Canceled', cls: 'border-ink-line text-paper/60' },
  incomplete: { label: 'Setup incomplete', cls: 'border-warning/50 bg-warning/10 text-warning' },
};

function Check({ on }: { on: boolean }) {
  return <span className={on ? 'text-success' : 'text-paper/30'}>{on ? '✓' : '—'}</span>;
}

function PlanContent() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const setup = params.get('setup');

  const garage = useOwnedGarage(id);
  const sub = useGarageSubscription(id);
  const checkout = useStartProCheckout(id);
  const portal = useOpenGaragePortal(id);
  const reconcile = useReconcileGaragePlan(id);

  useEffect(() => {
    reconcile.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setup]);

  const isPro = garagePlanIsPro(sub.data);
  const status = sub.data?.status ?? 'incomplete';
  const badge = STATUS_COPY[status] ?? STATUS_COPY.incomplete;
  const pastDue = status === 'past_due' || status === 'unpaid';

  return (
    <section className="py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-bold">Plan &amp; billing</h2>
        <span
          className={cn(
            'rounded-full border px-3 py-1 text-xs font-semibold',
            isPro ? 'border-gold/50 bg-gold/10 text-gold-ink' : 'border-ink-line text-paper/60',
          )}
        >
          {isPro ? 'PRO' : 'BASIC'}
        </span>
      </div>

      {setup === 'success' && (
        <p role="status" className="mt-6 rounded-lg border border-success/40 bg-success/10 p-4 text-sm">
          Payment received — your Pro plan is being confirmed. Unlimited quotes and Pro features are
          unlocking now.
        </p>
      )}
      {setup === 'cancelled' && (
        <p role="status" className="mt-6 rounded-lg border border-ink-line bg-ink-soft p-4 text-sm text-paper/60">
          Upgrade cancelled — no payment was taken. You&rsquo;re still on the free Basic plan.
        </p>
      )}
      {pastDue && (
        <p role="alert" className="mt-6 rounded-lg border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
          Your last Pro payment failed. Update your payment method to keep your Pro features.
        </p>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {/* Basic */}
        <div className={cn('rounded-hex border p-6', !isPro ? 'border-volt bg-volt/5' : 'border-ink-line bg-ink-soft')}>
          <div className="flex items-baseline justify-between">
            <h3 className="font-display text-lg font-bold">Basic</h3>
            <span className="font-display text-2xl font-extrabold">Free</span>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-paper/70">
            <li><Check on /> Free public profile</li>
            <li><Check on /> {BASIC_DAILY_QUOTE_LIMIT} quotes per day (2 credits each)</li>
            <li><Check on /> Reviews (view &amp; rating)</li>
            <li><Check on={false} /> No CRM, analytics or review replies</li>
          </ul>
          {!isPro && <p className="mt-4 text-xs font-semibold text-volt-bright">Your current plan</p>}
        </div>

        {/* Pro */}
        <div className={cn('rounded-hex border p-6', isPro ? 'border-gold bg-gold/5' : 'border-ink-line bg-ink-soft')}>
          <div className="flex items-baseline justify-between">
            <h3 className="font-display text-lg font-bold">Pro</h3>
            <span className="font-display text-2xl font-extrabold">
              €{PRO_PRICE_EUR}<span className="text-base font-semibold text-paper/50">/mo</span>
            </span>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-paper/70">
            {PRO_FEATURES.map((f) => (
              <li key={f.label}>
                <Check on /> {f.label}
                {f.soon && <span className="ml-1 text-xs text-paper/40">(coming soon)</span>}
              </li>
            ))}
          </ul>

          <div className="mt-5 flex flex-wrap gap-3">
            {!isPro ? (
              <button type="button" className="btn-primary" disabled={checkout.isPending} onClick={() => checkout.mutate()}>
                {checkout.isPending ? 'Opening checkout…' : `Upgrade to Pro — €${PRO_PRICE_EUR}/mo`}
              </button>
            ) : (
              <button type="button" className="btn-ghost" disabled={portal.isPending} onClick={() => portal.mutate()}>
                {portal.isPending ? 'Opening…' : 'Manage subscription'}
              </button>
            )}
            {pastDue && (
              <button type="button" className="btn-primary" disabled={portal.isPending} onClick={() => portal.mutate()}>
                Fix billing
              </button>
            )}
          </div>
          {isPro && badge && (
            <p className="mt-3 text-xs text-paper/50">
              Subscription: <span className="font-semibold">{badge.label}</span>
              {sub.data?.current_period_end &&
                ` · renews ${new Date(sub.data.current_period_end).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' })}`}
            </p>
          )}
          {(checkout.isError || portal.isError) && (
            <p role="alert" className="mt-3 text-sm text-danger">Could not open Stripe. Try again in a moment.</p>
          )}
        </div>
      </div>

      <p className="mt-6 text-xs text-paper/50">
        Reviews always stay owned by customers — Pro adds the ability to reply publicly, never to edit
        or remove them. {garage.data ? `Plan applies to ${garage.data.name}.` : ''}
      </p>
    </section>
  );
}

export default function Page() {
  return (
    <Suspense>
      <PlanContent />
    </Suspense>
  );
}

'use client';

import { Suspense, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useVehicles } from '@/lib/vehicles/queries';
import {
  fleetIsActive,
  useFleetSubscription,
  useMyAccount,
  useOpenBillingPortal,
  useReconcileFleet,
  useStartFleetCheckout,
  FLEET_PRICE_EUR,
} from '@/lib/fleet/queries';
import { cn } from '@/lib/utils';

const STATUS_COPY: Record<string, { label: string; cls: string }> = {
  active: { label: 'Active', cls: 'border-success/50 bg-success/10 text-success' },
  trialing: { label: 'Trial', cls: 'border-info/50 bg-info/10 text-info' },
  past_due: { label: 'Payment failed', cls: 'border-danger/50 bg-danger/10 text-danger' },
  unpaid: { label: 'Unpaid', cls: 'border-danger/50 bg-danger/10 text-danger' },
  canceled: { label: 'Canceled', cls: 'border-ink-line text-paper/60' },
  incomplete: { label: 'Setup incomplete', cls: 'border-warning/50 bg-warning/10 text-warning' },
};

function BillingContent() {
  const params = useSearchParams();
  const setup = params.get('setup');

  const account = useMyAccount();
  const isFleet = account.data?.account_type === 'fleet';
  const sub = useFleetSubscription(isFleet);
  const vehicles = useVehicles();
  const checkout = useStartFleetCheckout();
  const portal = useOpenBillingPortal();
  const reconcile = useReconcileFleet();

  // On load (and after returning from Stripe) pull the latest state.
  useEffect(() => {
    if (isFleet) reconcile.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFleet, setup]);

  const count = vehicles.data?.length ?? 0;
  const monthly = count * FLEET_PRICE_EUR;
  const active = fleetIsActive(sub.data);
  const status = sub.data?.status ?? 'incomplete';
  const badge = STATUS_COPY[status] ?? STATUS_COPY.incomplete;
  const pastDue = status === 'past_due' || status === 'unpaid';

  if (account.isSuccess && !isFleet) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="font-display text-3xl font-bold">Billing</h1>
        <div className="mt-8 rounded-hex border border-ink-line bg-ink-soft p-8">
          <p className="text-paper/70">
            Billing applies to Fleet accounts. Individual accounts are free and can hold up to 3
            vehicles.
          </p>
          <Link href="/for-business" className="btn-primary mt-6 inline-flex">
            Learn about Fleet
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-display text-3xl font-bold">Fleet billing</h1>

      {setup === 'success' && (
        <p role="status" className="mt-6 rounded-lg border border-success/40 bg-success/10 p-4 text-sm">
          Payment method saved — your fleet subscription is being confirmed. You can now add vehicles.
        </p>
      )}
      {setup === 'cancelled' && (
        <p role="status" className="mt-6 rounded-lg border border-ink-line bg-ink-soft p-4 text-sm text-paper/60">
          Billing setup cancelled — no payment was taken.
        </p>
      )}
      {pastDue && (
        <p role="alert" className="mt-6 rounded-lg border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
          Your last payment failed. Update your payment method to keep adding vehicles — existing
          vehicles and data stay accessible.
        </p>
      )}

      <section className="mt-6 rounded-hex border border-ink-line bg-ink-soft p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-paper/60">Subscription</p>
          <span className={cn('rounded-full border px-2.5 py-0.5 text-xs font-semibold', badge.cls)}>
            {badge.label}
          </span>
        </div>
        <p className="mt-2 font-display text-4xl font-extrabold">
          €{monthly}
          <span className="text-lg font-semibold text-paper/50"> /month</span>
        </p>
        <p className="mt-1 text-sm text-paper/60">
          {count} vehicle{count === 1 ? '' : 's'} × €{FLEET_PRICE_EUR}/month
          {sub.data?.current_period_end &&
            active &&
            ` · renews ${new Date(sub.data.current_period_end).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' })}`}
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          {!active ? (
            <button
              type="button"
              className="btn-primary"
              disabled={checkout.isPending}
              onClick={() => checkout.mutate()}
            >
              {checkout.isPending ? 'Opening checkout…' : 'Set up billing'}
            </button>
          ) : (
            <button
              type="button"
              className="btn-ghost"
              disabled={portal.isPending}
              onClick={() => portal.mutate()}
            >
              {portal.isPending ? 'Opening…' : 'Manage payment method'}
            </button>
          )}
          {pastDue && (
            <button
              type="button"
              className="btn-primary"
              disabled={portal.isPending}
              onClick={() => portal.mutate()}
            >
              Fix billing
            </button>
          )}
        </div>
        {(checkout.isError || portal.isError) && (
          <p role="alert" className="mt-3 text-sm text-danger">
            Something went wrong opening Stripe. Try again in a moment.
          </p>
        )}
      </section>

      <section className="mt-6 rounded-hex border border-ink-line bg-ink-soft p-6">
        <h2 className="font-display text-lg font-semibold">How Fleet billing works</h2>
        <ul className="mt-3 space-y-2 text-sm text-paper/70">
          <li>• You&rsquo;re charged €{FLEET_PRICE_EUR} per vehicle per month.</li>
          <li>• Adding or removing a vehicle updates your subscription automatically (prorated).</li>
          <li>• If a payment fails you keep access to your data, but can&rsquo;t add new vehicles until it&rsquo;s fixed.</li>
          <li>• Cancel any time from &ldquo;Manage payment method&rdquo;.</li>
        </ul>
        <Link href="/dashboard/vehicles" className="mt-4 inline-block text-sm font-semibold text-volt-bright hover:underline">
          Manage vehicles →
        </Link>
      </section>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense>
      <BillingContent />
    </Suspense>
  );
}

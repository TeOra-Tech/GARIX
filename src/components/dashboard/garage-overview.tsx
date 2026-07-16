'use client';

import Link from 'next/link';
import { useMyGarages } from '@/lib/garages/portal';
import { GarageTransferInbox } from '@/components/garages/transfer-inbox';
import { STATUS_BADGE } from '@/components/garages/status-badge';

export function GarageOverview() {
  const garages = useMyGarages();

  return (
    <div className="mt-8 space-y-6">
      <GarageTransferInbox />

      <section className="rounded-hex border border-ink-line bg-ink-soft p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">My garages</h2>
          <Link href="/dashboard/garages" className="text-sm font-semibold text-volt-bright hover:underline">
            View all
          </Link>
        </div>
        {garages.isPending && <p className="mt-3 text-sm text-paper/60">Loading your garages…</p>}
        {garages.data?.length === 0 && (
          <p className="mt-3 text-sm text-paper/60">
            You don&rsquo;t own a garage yet.{' '}
            <Link href="/garages/register" className="text-volt-bright hover:underline">
              Register one — free
            </Link>
            .
          </p>
        )}
        {!!garages.data?.length && (
          <ul className="mt-4 space-y-3">
            {garages.data.map((g) => (
              <li key={g.id}>
                <Link
                  href={`/dashboard/garages/${g.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-transparent p-2 transition hover:border-volt/40 hover:bg-volt/5"
                >
                  <span>
                    <span className="block font-medium">{g.name}</span>
                    <span className="block text-sm text-paper/60">
                      {g.garage_locations.find((l) => l.is_primary)?.town ?? g.garage_locations[0]?.town}
                      {g.review_count > 0 && (
                        <>
                          {' · '}
                          <span className="text-gold">★</span> {Number(g.avg_rating).toFixed(1)} ({g.review_count})
                        </>
                      )}
                    </span>
                  </span>
                  {STATUS_BADGE(g.status)}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-hex border border-ink-line bg-ink-soft p-6">
        <h2 className="font-display text-lg font-semibold">Account details</h2>
        <p className="mt-2 text-sm text-paper/60">
          Your name, contact details and notification preferences.
        </p>
        <Link href="/dashboard/account" className="btn-ghost mt-4 inline-flex !px-4 !py-2 text-sm">
          Manage account
        </Link>
      </section>
    </div>
  );
}

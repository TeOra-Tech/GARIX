'use client';

import Link from 'next/link';
import { useGarageTransfers, useMyGarages } from '@/lib/garages/portal';
import { GarageTransferInbox } from '@/components/garages/transfer-inbox';
import { STATUS_BADGE } from '@/components/garages/status-badge';

export default function MyGaragesPage() {
  const garages = useMyGarages();
  const transfers = useGarageTransfers();

  const pendingOutgoing = new Set(
    transfers.data?.rows
      .filter((t) => t.status === 'pending' && t.from_user_id === transfers.data.userId)
      .map((t) => t.garage_id),
  );

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold">My garages</h1>
        <Link href="/garages/register" className="btn-primary !px-4 !py-2 text-sm">
          Register a garage
        </Link>
      </div>

      <div className="mt-6">
        <GarageTransferInbox />
      </div>

      {garages.isPending && <p className="mt-8 text-paper/60">Loading your garages…</p>}
      {garages.isError && (
        <p role="alert" className="mt-8 text-danger">Could not load your garages. Refresh to try again.</p>
      )}
      {garages.data?.length === 0 && (
        <div className="mt-8 rounded-hex border border-ink-line bg-ink-soft p-8 text-center">
          <p className="text-paper/70">No garages yet.</p>
          <p className="mt-2 text-sm text-paper/50">
            Register your garage to receive matching repair requests and quote for jobs.
          </p>
          <Link href="/garages/register" className="btn-primary mt-6 inline-flex">
            Register your garage — free
          </Link>
        </div>
      )}

      {!!garages.data?.length && (
        <ul className="mt-8 space-y-4">
          {garages.data.map((g) => {
            const town = g.garage_locations.find((l) => l.is_primary)?.town ?? g.garage_locations[0]?.town;
            return (
              <li key={g.id} className="rounded-hex border border-ink-line bg-ink-soft p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-lg font-semibold">{g.name}</h2>
                    <p className="mt-1 text-sm text-paper/60">
                      {[
                        town && `${town}`,
                        g.phone,
                        g.review_count > 0
                          ? `★ ${Number(g.avg_rating).toFixed(1)} (${g.review_count} review${g.review_count > 1 ? 's' : ''})`
                          : 'No reviews yet',
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                    {pendingOutgoing.has(g.id) && (
                      <p className="mt-2 text-xs font-semibold text-warning">
                        Ownership transfer pending — waiting for the new owner to accept.
                      </p>
                    )}
                  </div>
                  {STATUS_BADGE(g.status)}
                </div>
                <div className="mt-4 flex flex-wrap gap-3 text-sm">
                  <Link href={`/dashboard/garages/${g.id}`} className="btn-primary !px-4 !py-2">
                    Open dashboard
                  </Link>
                  {g.status === 'active' && (
                    <Link href={`/garages/${g.slug}`} className="btn-ghost !px-4 !py-2">
                      Public profile
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}

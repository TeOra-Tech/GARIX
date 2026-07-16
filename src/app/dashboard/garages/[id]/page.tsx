'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useOwnedGarage } from '@/lib/garages/portal';
import {
  useMyGarageQuotes,
  useOpenRequestsFeed,
  useQuoteCosts,
  useWallet,
  type FeedRequest,
} from '@/lib/quotes/queries';
import { URGENCY_LABELS } from '@/lib/validation/request';
import { formatEur } from '@/lib/vat';
import { cn } from '@/lib/utils';

function vehicleSummary(r: FeedRequest): string {
  const v = r.vehicles;
  if (!v) return 'Vehicle withheld';
  return [v.year, v.vehicle_makes?.name ?? v.make_text, v.vehicle_models?.name ?? v.model_text]
    .filter(Boolean)
    .join(' ');
}

export default function GarageRequestFeedPage() {
  const { id } = useParams<{ id: string }>();
  const garage = useOwnedGarage(id);
  const isActive = garage.data?.status === 'active';
  const feed = useOpenRequestsFeed(isActive);
  const myQuotes = useMyGarageQuotes(garage.data?.id);
  const wallet = useWallet(garage.data?.id);
  const costs = useQuoteCosts();

  const quotedRequestIds = new Set(myQuotes.data?.map((q) => q.request_id));
  const balance = wallet.data?.balance ?? 0;
  const lowBalance = wallet.data != null && balance < (wallet.data.low_balance_threshold ?? 10);

  return (
    <section className="py-8">
      <h2 className="sr-only">Request feed</h2>

      {garage.data && !isActive && (
        <p className="rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm text-warning">
          Your garage is awaiting verification — the request feed opens once it&rsquo;s approved.
        </p>
      )}

      {isActive && (
        <>
          <div
            className={cn(
              'flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4 text-sm',
              lowBalance ? 'border-signal/40 bg-signal/10' : 'border-ink-line bg-ink-soft',
            )}
          >
            <p>
              Balance: <span className="font-display font-semibold">{balance} credits</span>
              {costs.data && (
                <span className="text-paper/50">
                  {' '}· quote costs {costs.data.standard} credits ({costs.data.priority} priority)
                </span>
              )}
            </p>
            {lowBalance && (
              <Link href={`/dashboard/garages/${id}/wallet`} className="text-volt-bright hover:underline">
                Low balance — top up
              </Link>
            )}
          </div>

          {feed.isPending && <p className="mt-8 text-paper/60">Loading open requests…</p>}
          {feed.isError && (
            <p role="alert" className="mt-8 text-danger">Could not load the feed. Refresh to try again.</p>
          )}
          {feed.data?.length === 0 && (
            <p className="mt-8 rounded-hex border border-ink-line bg-ink-soft p-8 text-center text-paper/60">
              No open requests right now — new ones appear here as customers post them.
            </p>
          )}

          <ul className="mt-6 space-y-4">
            {feed.data?.map((r) => {
              const alreadyQuoted = quotedRequestIds.has(r.id);
              return (
                <li key={r.id} className="rounded-hex border border-ink-line bg-ink-soft p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-display text-lg font-semibold">{r.title}</h3>
                      <p className="mt-1 text-sm text-paper/60">
                        {[
                          r.service_category?.name,
                          vehicleSummary(r),
                          `${r.location_town}, Co. ${r.location_county}`,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'shrink-0 rounded-full border px-3 py-1 text-xs',
                        r.urgency === 'emergency' || r.urgency === 'within_24h'
                          ? 'border-signal/50 text-signal-soft'
                          : 'border-ink-line text-paper/60',
                      )}
                    >
                      {URGENCY_LABELS[r.urgency]}
                    </span>
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm text-paper/70">{r.description}</p>
                  <p className="mt-3 text-xs text-paper/40">
                    {[
                      r.budget_amount != null && `Budget ${formatEur(Number(r.budget_amount))}`,
                      r.collection_required && 'Collection required',
                      r.request_attachments.length > 0 && `${r.request_attachments.length} attachment${r.request_attachments.length > 1 ? 's' : ''}`,
                      `Posted ${new Date(r.created_at).toLocaleDateString('en-IE', { day: 'numeric', month: 'short' })}`,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  <div className="mt-4">
                    {alreadyQuoted ? (
                      <span className="rounded-full border border-volt/50 px-3 py-1 text-xs text-volt-bright">
                        Quote submitted
                      </span>
                    ) : (
                      <Link
                        href={`/dashboard/garages/${id}/requests/${r.id}/quote`}
                        className="btn-primary !px-4 !py-2 text-sm"
                      >
                        Write a quote
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}

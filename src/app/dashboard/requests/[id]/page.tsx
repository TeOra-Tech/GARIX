'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useOpenConversation } from '@/lib/messages/queries';
import { ReviewSection } from '@/components/reviews/review-section';
import { track } from '@/lib/analytics';
import {
  useAcceptQuote,
  useMyRequest,
  useQuoteComparisonStats,
  useRequestQuotes,
  type QuoteComparisonStat,
  type QuoteWithGarage,
} from '@/lib/quotes/queries';
import { formatEur } from '@/lib/vat';
import { URGENCY_LABELS } from '@/lib/validation/request';
import { cn } from '@/lib/utils';

// ---------- quote categorisation (Cheapest / Fastest / Best value) ----------

type Stats = Record<string, QuoteComparisonStat>;

const MS_DAY = 86_400_000;

/** Days from today until a garage can start; unknown availability sorts last. */
function readyDays(q: QuoteWithGarage): number {
  if (!q.earliest_start_date) return Number.POSITIVE_INFINITY;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((new Date(`${q.earliest_start_date}T00:00:00`).getTime() - today.getTime()) / MS_DAY));
}

/** Fastest: soonest it can be done, then shortest job, then cheapest. */
function fasterThan(a: QuoteWithGarage, b: QuoteWithGarage): number {
  const rd = readyDays(a) - readyDays(b);
  if (rd !== 0) return rd;
  const da = a.estimated_duration_hours ?? Number.POSITIVE_INFINITY;
  const db = b.estimated_duration_hours ?? Number.POSITIVE_INFINITY;
  if (da !== db) return da - db;
  return Number(a.grand_total) - Number(b.grand_total);
}

type Picks = { cheapest?: string; fastest?: string; bestValue?: string };

/** Winners among the quotes the customer can still act on. */
function computePicks(quotes: QuoteWithGarage[]): Picks {
  const now = Date.now();
  const live = quotes.filter((q) => q.status === 'submitted' && new Date(q.valid_until).getTime() >= now);
  if (live.length < 2) return {};

  const cheapest = [...live].sort((a, b) => Number(a.grand_total) - Number(b.grand_total))[0];
  const anyTimeSignal = live.some((q) => q.earliest_start_date || q.estimated_duration_hours != null);
  const fastest = anyTimeSignal ? [...live].sort(fasterThan)[0] : undefined;

  // Best value = balanced price + time (each min–max normalised to 0..1, 0 is best).
  const prices = live.map((q) => Number(q.grand_total));
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const knownDays = live.map(readyDays).filter((d) => Number.isFinite(d));
  const worstDays = knownDays.length ? Math.max(...knownDays) : 0;
  const days = live.map((q) => (Number.isFinite(readyDays(q)) ? readyDays(q) : worstDays + 1));
  const minD = Math.min(...days);
  const maxD = Math.max(...days);
  const norm = (v: number, lo: number, hi: number) => (hi > lo ? (v - lo) / (hi - lo) : 0);
  const scored = live.map((q, i) => ({
    id: q.id,
    score: 0.5 * norm(Number(q.grand_total), minP, maxP) + 0.5 * norm(days[i], minD, maxD),
  }));
  const bestValueId = [...scored].sort((a, b) => a.score - b.score)[0].id;

  const picks: Picks = { cheapest: cheapest.id, fastest: fastest?.id, bestValue: bestValueId };
  // A single quote shouldn't wear every hat: only keep "Best value" if it's a
  // genuine compromise (differs from the cheapest and, when known, the fastest).
  if (picks.bestValue === picks.cheapest && (!picks.fastest || picks.bestValue === picks.fastest)) {
    delete picks.bestValue;
  }
  return picks;
}

const BADGE_STYLES: Record<string, string> = {
  'Best value': 'border-volt bg-volt/15 text-volt-bright',
  Cheapest: 'border-gold/60 bg-gold/10 text-gold',
  Fastest: 'border-signal/50 bg-signal/10 text-signal-soft',
};

function badgesFor(id: string, picks: Picks): string[] {
  const out: string[] = [];
  if (picks.bestValue === id) out.push('Best value');
  if (picks.cheapest === id) out.push('Cheapest');
  if (picks.fastest === id) out.push('Fastest');
  return out;
}

function formatDate(d: string) {
  return new Date(`${d}T00:00:00`).toLocaleDateString('en-IE', { day: 'numeric', month: 'short' });
}

function availabilityLabel(q: QuoteWithGarage): string {
  if (!q.earliest_start_date) return 'On request';
  const days = readyDays(q);
  if (days <= 0) return 'From today';
  if (days === 1) return 'From tomorrow';
  return `From ${formatDate(q.earliest_start_date)}`;
}

// ---------- sorting ----------

const SORTS = {
  // 'best' ordering is resolved via pick rank in the component; this comparator is
  // only a fallback and mirrors price.
  best: { label: 'Best value', fn: (a: QuoteWithGarage, b: QuoteWithGarage) => Number(a.grand_total) - Number(b.grand_total) },
  total: { label: 'Cheapest', fn: (a: QuoteWithGarage, b: QuoteWithGarage) => Number(a.grand_total) - Number(b.grand_total) },
  fastest: { label: 'Soonest available', fn: fasterThan },
  rating: { label: 'Garage rating', fn: (a: QuoteWithGarage, b: QuoteWithGarage) => Number(b.garages?.avg_rating ?? 0) - Number(a.garages?.avg_rating ?? 0) },
} as const;
type SortKey = keyof typeof SORTS;

function MessageGarageButton({ requestId, garageId }: { requestId: string; garageId: string }) {
  const router = useRouter();
  const open = useOpenConversation();
  return (
    <button
      type="button"
      className="btn-ghost !px-4 !py-2 text-sm"
      disabled={open.isPending}
      onClick={() =>
        open.mutate(
          { requestId, garageId },
          { onSuccess: (conversationId) => router.push(`/dashboard/messages/${conversationId}`) },
        )
      }
    >
      {open.isPending ? 'Opening…' : 'Message garage'}
    </button>
  );
}

/** A single labelled comparison signal in the card's stat grid. */
function Signal({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-lg border border-ink-line/60 bg-ink px-3 py-2">
      <dt className="text-[0.7rem] uppercase tracking-wide text-paper/40">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-paper">{value}</dd>
      {hint && <dd className="text-[0.7rem] text-paper/40">{hint}</dd>}
    </div>
  );
}

function QuoteCard({
  quote,
  stat,
  badges,
  canAccept,
  accepted,
  onAccept,
  accepting,
}: {
  quote: QuoteWithGarage;
  stat: QuoteComparisonStat | undefined;
  badges: string[];
  canAccept: boolean;
  accepted: boolean;
  onAccept: () => void;
  accepting: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const g = quote.garages;
  const expired = new Date(quote.valid_until) < new Date();

  return (
    <li
      id={`quote-${quote.id}`}
      className={cn(
        'scroll-mt-24 rounded-hex border p-6',
        accepted ? 'border-volt bg-volt/10' : quote.status === 'rejected' ? 'border-ink-line bg-ink-soft opacity-60' : 'border-ink-line bg-ink-soft',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            {g ? (
              <Link href={`/garages/${g.slug}`} className="font-display text-lg font-semibold hover:text-volt-bright">
                {g.name}
              </Link>
            ) : (
              <span className="font-display text-lg font-semibold">Garage</span>
            )}
            {badges.map((b) => (
              <span key={b} className={cn('rounded-full border px-2 py-0.5 text-xs font-medium', BADGE_STYLES[b])}>
                {b}
              </span>
            ))}
            {quote.is_priority && (
              <span className="rounded-full border border-ink-line px-2 py-0.5 text-xs text-paper/50">Priority</span>
            )}
            {accepted && (
              <span className="rounded-full border border-volt px-2 py-0.5 text-xs text-volt-bright">Accepted</span>
            )}
            {quote.status === 'rejected' && (
              <span className="rounded-full border border-ink-line px-2 py-0.5 text-xs text-paper/40">Not chosen</span>
            )}
          </div>
          <p className="mt-1 text-sm text-paper/60">
            valid until {formatDate(quote.valid_until.slice(0, 10))}
            {expired && <span className="text-signal-soft"> (expired)</span>}
          </p>
        </div>
        <p className="font-display text-2xl font-bold text-navy">{formatEur(Number(quote.grand_total))}</p>
      </div>

      {/* comparison signals: availability · rating · similar jobs · experience · distance */}
      <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <Signal
          label="Availability"
          value={availabilityLabel(quote)}
          hint={quote.estimated_duration_hours != null ? `~${quote.estimated_duration_hours} hr job` : undefined}
        />
        <Signal
          label="Rating"
          value={
            g && g.review_count > 0 ? (
              <><span className="text-gold">★</span> {Number(g.avg_rating).toFixed(1)}</>
            ) : (
              'New'
            )
          }
          hint={g && g.review_count > 0 ? `${g.review_count} review${g.review_count === 1 ? '' : 's'}` : 'No reviews yet'}
        />
        <Signal
          label="Similar jobs"
          value={stat ? stat.similar_jobs_count : '—'}
          hint="done via Garix"
        />
        <Signal
          label="Experience"
          value={g?.years_in_business != null ? `${g.years_in_business} yr${g.years_in_business === 1 ? '' : 's'}` : '—'}
          hint={g?.years_in_business != null ? 'in business' : undefined}
        />
        <Signal
          label="Distance"
          value={stat?.distance_km != null ? `${stat.distance_km} km` : '—'}
          hint={stat?.distance_km != null ? 'from you' : undefined}
        />
      </dl>

      {/* full VAT breakdown — always visible for like-for-like comparison */}
      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1 font-mono text-sm text-paper/70 sm:grid-cols-3">
        <div className="flex justify-between"><dt>Labour</dt><dd>{formatEur(Number(quote.labour_cost))}</dd></div>
        <div className="flex justify-between"><dt>Labour VAT {(Number(quote.labour_vat_rate) * 100).toFixed(1)}%</dt><dd>{formatEur(Number(quote.labour_vat))}</dd></div>
        <div className="flex justify-between"><dt>Parts</dt><dd>{formatEur(Number(quote.parts_cost))}</dd></div>
        <div className="flex justify-between"><dt>Parts VAT {(Number(quote.parts_vat_rate) * 100).toFixed(0)}%</dt><dd>{formatEur(Number(quote.parts_vat))}</dd></div>
        <div className="flex justify-between"><dt>Total VAT</dt><dd>{formatEur(Number(quote.total_vat))}</dd></div>
        <div className="flex justify-between font-semibold text-paper"><dt>Total</dt><dd>{formatEur(Number(quote.grand_total))}</dd></div>
      </dl>

      {quote.quote_items.length > 0 && (
        <button type="button" className="mt-3 text-sm text-volt-bright underline" onClick={() => setExpanded((e) => !e)}>
          {expanded ? 'Hide' : 'Show'} itemised breakdown ({quote.quote_items.length})
        </button>
      )}
      {expanded && (
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="border-b border-ink-line text-left text-xs uppercase tracking-wide text-paper/40">
              <th className="py-2 font-medium">Item</th>
              <th className="py-2 font-medium">Type</th>
              <th className="py-2 text-right font-medium">Qty</th>
              <th className="py-2 text-right font-medium">Each</th>
              <th className="py-2 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {quote.quote_items.map((i) => (
              <tr key={i.id} className="border-b border-ink-line/50">
                <td className="py-2">{i.description}</td>
                <td className="py-2 capitalize text-paper/60">{i.item_type}</td>
                <td className="py-2 text-right">{Number(i.quantity)}</td>
                <td className="py-2 text-right">{formatEur(Number(i.unit_price))}</td>
                <td className="py-2 text-right">{formatEur(Number(i.line_total))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {(quote.warranty_info || quote.notes) && (
        <p className="mt-3 text-sm text-paper/60">
          {quote.warranty_info && <>Warranty: {quote.warranty_info}<br /></>}
          {quote.notes}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        {canAccept && quote.status === 'submitted' && !expired && (
          confirming ? (
            <>
              <button type="button" className="btn-primary !px-4 !py-2 text-sm" onClick={onAccept} disabled={accepting}>
                {accepting ? 'Accepting…' : 'Confirm — accept this quote'}
              </button>
              <button type="button" className="btn-ghost !px-4 !py-2 text-sm" onClick={() => setConfirming(false)}>
                Cancel
              </button>
            </>
          ) : (
            <button type="button" className="btn-primary !px-4 !py-2 text-sm" onClick={() => setConfirming(true)}>
              Accept quote
            </button>
          )
        )}
        {(quote.status === 'submitted' || accepted) && (
          <MessageGarageButton requestId={quote.request_id} garageId={quote.garage_id} />
        )}
      </div>
    </li>
  );
}

/** Compact "top pick" card that scrolls to the matching quote below. */
function PickCard({ label, quote, stat }: { label: string; quote: QuoteWithGarage; stat: QuoteComparisonStat | undefined }) {
  const detail =
    label === 'Fastest'
      ? availabilityLabel(quote)
      : label === 'Cheapest'
        ? 'Lowest total price'
        : 'Balanced price & time';
  return (
    <button
      type="button"
      onClick={() => document.getElementById(`quote-${quote.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
      className={cn('rounded-hex border p-4 text-left transition hover:brightness-110', BADGE_STYLES[label])}
    >
      <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      <p className="mt-1 truncate font-display text-base font-semibold text-paper">{quote.garages?.name ?? 'Garage'}</p>
      <p className="font-display text-xl font-bold text-paper">{formatEur(Number(quote.grand_total))}</p>
      <p className="mt-1 text-xs text-paper/60">{detail}{stat?.distance_km != null ? ` · ${stat.distance_km} km` : ''}</p>
    </button>
  );
}

export default function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const request = useMyRequest(id);
  const quotes = useRequestQuotes(id);
  const stats = useQuoteComparisonStats(id);
  const accept = useAcceptQuote(id);
  const [sort, setSort] = useState<SortKey>('best');

  const statMap: Stats = stats.data ?? {};
  const picks = useMemo(() => (quotes.data ? computePicks(quotes.data) : {}), [quotes.data]);

  const sorted = useMemo(() => {
    if (!quotes.data) return [];
    const base = [...quotes.data];
    if (sort === 'best') {
      // Best value ordering: winners first (best value, cheapest, fastest), then price.
      const rank = (q: QuoteWithGarage) =>
        q.id === picks.bestValue ? 0 : q.id === picks.cheapest ? 1 : q.id === picks.fastest ? 2 : 3;
      return base.sort(
        (a, b) =>
          Number(b.is_priority) - Number(a.is_priority) ||
          rank(a) - rank(b) ||
          Number(a.grand_total) - Number(b.grand_total),
      );
    }
    return base.sort((a, b) => Number(b.is_priority) - Number(a.is_priority) || SORTS[sort].fn(a, b));
  }, [quotes.data, sort, picks]);

  const canAccept = ['open', 'quoted'].includes(request.data?.status ?? '');
  const pickList = ([
    ['Best value', picks.bestValue],
    ['Cheapest', picks.cheapest],
    ['Fastest', picks.fastest],
  ] as const).filter(([, qid]) => qid) as [string, string][];

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/dashboard/requests" className="text-sm text-paper/60 hover:text-volt-bright">
        &larr; My requests
      </Link>

      {request.isError && <p role="alert" className="mt-8 text-danger">Could not load this request.</p>}

      {request.data && (
        <>
          <h1 className="mt-2 font-display text-3xl font-bold">{request.data.title}</h1>
          <p className="mt-2 text-sm text-paper/60">
            {[
              [request.data.vehicles?.vehicle_makes?.name ?? request.data.vehicles?.make_text,
               request.data.vehicles?.vehicle_models?.name ?? request.data.vehicles?.model_text]
                .filter(Boolean).join(' '),
              URGENCY_LABELS[request.data.urgency],
              `status: ${request.data.status.replace('_', ' ')}`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>

          {request.data.status === 'accepted' && (
            <p className="mt-6 rounded-lg border border-volt/40 bg-volt/10 p-4 text-sm">
              Quote accepted — the garage will be in touch. Message them any time from your dashboard.
            </p>
          )}
          {accept.isError && (
            <p role="alert" className="mt-6 rounded-lg border border-signal/40 bg-signal/10 p-4 text-sm text-signal-soft">
              Could not accept that quote — it may have expired or the request has moved on. Refresh and try again.
            </p>
          )}

          {/* Top picks — categorised shortcuts into the list below */}
          {pickList.length > 0 && (
            <section className="mt-8">
              <h2 className="font-display text-lg font-semibold">Top picks</h2>
              <p className="text-sm text-paper/50">Our shortlist across price and availability — compare the full details below.</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {pickList.map(([label, qid]) => {
                  const q = quotes.data!.find((x) => x.id === qid)!;
                  return <PickCard key={label} label={label} quote={q} stat={statMap[q.garage_id]} />;
                })}
              </div>
            </section>
          )}

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-xl font-semibold">
              {quotes.data ? `${quotes.data.length} quote${quotes.data.length === 1 ? '' : 's'}` : 'Quotes'}
            </h2>
            <label className="flex items-center gap-2 text-sm text-paper/60">
              Sort by
              <select
                aria-label="Sort quotes"
                className="rounded-lg border border-ink-line bg-ink-soft px-3 py-2 text-paper"
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
              >
                {Object.entries(SORTS).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </label>
          </div>

          {quotes.isPending && <p className="mt-6 text-paper/60">Loading quotes…</p>}
          {quotes.data?.length === 0 && (
            <p className="mt-6 rounded-hex border border-ink-line bg-ink-soft p-8 text-center text-paper/60">
              No quotes yet — garages in your area have been notified. Most quotes arrive within a day.
            </p>
          )}

          <ul className="mt-6 space-y-4">
            {sorted.map((q) => (
              <QuoteCard
                key={q.id}
                quote={q}
                stat={statMap[q.garage_id]}
                badges={badgesFor(q.id, picks)}
                canAccept={canAccept}
                accepted={request.data.accepted_quote_id === q.id || q.status === 'accepted'}
                onAccept={() =>
                  accept.mutate(q.id, {
                    onSuccess: () => track('quote_accepted', { total: Number(q.grand_total) }),
                  })
                }
                accepting={accept.isPending}
              />
            ))}
          </ul>

          <ReviewSection
            requestId={id}
            garageId={
              quotes.data?.find((q) => q.id === request.data.accepted_quote_id)?.garage_id ?? null
            }
            status={request.data.status}
          />
        </>
      )}
    </main>
  );
}

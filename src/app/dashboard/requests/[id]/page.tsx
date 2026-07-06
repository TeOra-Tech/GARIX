'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useOpenConversation } from '@/lib/messages/queries';
import { ReviewSection } from '@/components/reviews/review-section';
import {
  useAcceptQuote,
  useMyRequest,
  useRequestQuotes,
  type QuoteWithGarage,
} from '@/lib/quotes/queries';
import { formatEur } from '@/lib/vat';
import { URGENCY_LABELS } from '@/lib/validation/request';
import { cn } from '@/lib/utils';

const SORTS = {
  total: { label: 'Total price', fn: (a: QuoteWithGarage, b: QuoteWithGarage) => Number(a.grand_total) - Number(b.grand_total) },
  labour: { label: 'Labour', fn: (a: QuoteWithGarage, b: QuoteWithGarage) => Number(a.labour_cost) - Number(b.labour_cost) },
  parts: { label: 'Parts', fn: (a: QuoteWithGarage, b: QuoteWithGarage) => Number(a.parts_cost) - Number(b.parts_cost) },
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

function QuoteCard({
  quote,
  canAccept,
  accepted,
  onAccept,
  accepting,
}: {
  quote: QuoteWithGarage;
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
      className={cn(
        'rounded-hex border p-6',
        accepted ? 'border-volt bg-volt/10' : quote.status === 'rejected' ? 'border-ink-line bg-ink-soft opacity-60' : 'border-ink-line bg-ink-soft',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            {g ? (
              <Link href={`/garages/${g.slug}`} className="font-display text-lg font-semibold hover:text-volt-bright">
                {g.name}
              </Link>
            ) : (
              <span className="font-display text-lg font-semibold">Garage</span>
            )}
            {quote.is_priority && (
              <span className="rounded-full border border-signal/50 px-2 py-0.5 text-xs text-signal-soft">Priority</span>
            )}
            {accepted && (
              <span className="rounded-full border border-volt px-2 py-0.5 text-xs text-volt-bright">Accepted</span>
            )}
            {quote.status === 'rejected' && (
              <span className="rounded-full border border-ink-line px-2 py-0.5 text-xs text-paper/40">Not chosen</span>
            )}
          </div>
          <p className="mt-1 text-sm text-paper/60">
            {g && g.review_count > 0 ? (
              <>
                <span className="text-signal">★</span> {Number(g.avg_rating).toFixed(1)} ({g.review_count})
              </>
            ) : (
              'No reviews yet'
            )}
            {quote.estimated_duration_hours != null && ` · est. ${quote.estimated_duration_hours} hrs`}
            {' · '}valid until {new Date(quote.valid_until).toLocaleDateString('en-IE', { day: 'numeric', month: 'short' })}
            {expired && <span className="text-signal-soft"> (expired)</span>}
          </p>
        </div>
        <p className="font-display text-2xl font-bold text-signal">{formatEur(Number(quote.grand_total))}</p>
      </div>

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

export default function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const request = useMyRequest(id);
  const quotes = useRequestQuotes(id);
  const accept = useAcceptQuote(id);
  const [sort, setSort] = useState<SortKey>('total');

  const sorted = quotes.data
    ? [...quotes.data].sort((a, b) => Number(b.is_priority) - Number(a.is_priority) || SORTS[sort].fn(a, b))
    : [];
  const canAccept = ['open', 'quoted'].includes(request.data?.status ?? '');

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/dashboard/requests" className="text-sm text-paper/60 hover:text-volt-bright">
        &larr; My requests
      </Link>

      {request.isError && <p role="alert" className="mt-8 text-signal">Could not load this request.</p>}

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
                canAccept={canAccept}
                accepted={request.data.accepted_quote_id === q.id || q.status === 'accepted'}
                onAccept={() => accept.mutate(q.id)}
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

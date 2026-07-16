'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useGarageQuotes, type GarageQuote } from '@/lib/garages/portal';
import { formatEur } from '@/lib/vat';
import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<string, string> = {
  submitted: 'border-info/50 bg-info/10 text-info',
  accepted: 'border-success/50 bg-success/10 text-success',
  rejected: 'border-danger/50 bg-danger/10 text-danger',
  withdrawn: 'border-ink-line text-paper/50',
  expired: 'border-ink-line text-paper/50',
};

const FILTERS = ['all', 'submitted', 'accepted', 'rejected', 'expired'] as const;

function QuoteCard({ quote }: { quote: GarageQuote }) {
  return (
    <li className="rounded-hex border border-ink-line bg-ink-soft p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display font-semibold">{quote.service_requests?.title ?? 'Request removed'}</h3>
          <p className="mt-1 text-sm text-paper/60">
            {[
              quote.service_requests?.location_town &&
                `${quote.service_requests.location_town}, Co. ${quote.service_requests.location_county}`,
              `Quoted ${new Date(quote.created_at).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' })}`,
              quote.is_priority && 'Priority',
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        <span
          className={cn(
            'rounded-full border px-2.5 py-0.5 text-xs font-semibold',
            STATUS_STYLES[quote.status] ?? 'border-ink-line text-paper/60',
          )}
        >
          {quote.status}
        </span>
      </div>
      <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 font-mono text-sm text-paper/70">
        <div>
          <dt className="inline text-paper/50">Labour </dt>
          <dd className="inline">{formatEur(Number(quote.labour_cost))}</dd>
        </div>
        <div>
          <dt className="inline text-paper/50">Parts </dt>
          <dd className="inline">{formatEur(Number(quote.parts_cost))}</dd>
        </div>
        <div>
          <dt className="inline text-paper/50">VAT </dt>
          <dd className="inline">{formatEur(Number(quote.total_vat))}</dd>
        </div>
        <div className="font-semibold text-paper">
          <dt className="inline text-paper/50">Total </dt>
          <dd className="inline">{formatEur(Number(quote.grand_total))}</dd>
        </div>
      </dl>
      <p className="mt-2 text-xs text-paper/40">{quote.credits_charged} credits charged</p>
    </li>
  );
}

export default function GarageQuotesPage() {
  const { id } = useParams<{ id: string }>();
  const quotes = useGarageQuotes(id);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('all');

  const filtered = quotes.data?.filter((q) => filter === 'all' || q.status === filter) ?? [];

  return (
    <section className="py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-bold">Quotes provided</h2>
        <div role="group" aria-label="Filter quotes" className="flex gap-1 text-sm">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              className={cn(
                'rounded-full border px-3 py-1 capitalize transition',
                filter === f ? 'border-volt bg-volt/10 text-volt-bright' : 'border-ink-line text-paper/60 hover:text-paper',
              )}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {quotes.isPending && <p className="mt-6 text-paper/60">Loading quotes…</p>}
      {quotes.isError && (
        <p role="alert" className="mt-6 text-danger">Could not load quotes. Refresh to try again.</p>
      )}
      {quotes.data?.length === 0 && (
        <p className="mt-6 rounded-hex border border-ink-line bg-ink-soft p-8 text-center text-paper/60">
          No quotes yet — pick a job from the request feed and send your first one.
        </p>
      )}
      {!!quotes.data?.length && filtered.length === 0 && (
        <p className="mt-6 text-sm text-paper/60">No {filter} quotes.</p>
      )}
      <ul className="mt-6 space-y-4">
        {filtered.map((q) => (
          <QuoteCard key={q.id} quote={q} />
        ))}
      </ul>
    </section>
  );
}

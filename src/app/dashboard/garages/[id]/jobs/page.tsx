'use client';

import { useParams } from 'next/navigation';
import { useGarageQuotes, type GarageQuote } from '@/lib/garages/portal';
import { formatEur } from '@/lib/vat';
import { cn } from '@/lib/utils';

function JobCard({ quote }: { quote: GarageQuote }) {
  const done = quote.service_requests?.status === 'completed';
  return (
    <li className="rounded-hex border border-ink-line bg-ink-soft p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display font-semibold">{quote.service_requests?.title ?? 'Request removed'}</h3>
          <p className="mt-1 text-sm text-paper/60">
            {[
              quote.service_requests?.location_town &&
                `${quote.service_requests.location_town}, Co. ${quote.service_requests.location_county}`,
              done && quote.service_requests?.completed_at
                ? `Completed ${new Date(quote.service_requests.completed_at).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' })}`
                : `Won ${new Date(quote.updated_at).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' })}`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        <span
          className={cn(
            'rounded-full border px-2.5 py-0.5 text-xs font-semibold',
            done ? 'border-success/50 bg-success/10 text-success' : 'border-info/50 bg-info/10 text-info',
          )}
        >
          {done ? 'Job done' : (quote.service_requests?.status ?? 'accepted').replace(/_/g, ' ')}
        </span>
      </div>
      <p className="mt-3 font-mono text-sm">
        <span className="text-paper/50">Value </span>
        <span className="font-semibold">{formatEur(Number(quote.grand_total))}</span>
        <span className="text-paper/50"> incl. VAT</span>
      </p>
    </li>
  );
}

export default function GarageJobsPage() {
  const { id } = useParams<{ id: string }>();
  const quotes = useGarageQuotes(id);

  const won = quotes.data?.filter((q) => q.status === 'accepted') ?? [];
  const active = won.filter((q) => q.service_requests?.status !== 'completed');
  const done = won.filter((q) => q.service_requests?.status === 'completed');
  const totalValue = done.reduce((sum, q) => sum + Number(q.grand_total), 0);

  return (
    <section className="py-8">
      <h2 className="font-display text-2xl font-bold">Jobs</h2>
      <p className="mt-1 text-sm text-paper/60">Accepted quotes and completed work.</p>

      {quotes.isPending && <p className="mt-6 text-paper/60">Loading jobs…</p>}
      {quotes.isError && (
        <p role="alert" className="mt-6 text-danger">Could not load jobs. Refresh to try again.</p>
      )}
      {quotes.isSuccess && won.length === 0 && (
        <p className="mt-6 rounded-hex border border-ink-line bg-ink-soft p-8 text-center text-paper/60">
          No jobs yet — they appear here when a customer accepts one of your quotes.
        </p>
      )}

      {active.length > 0 && (
        <>
          <h3 className="mt-8 font-display text-lg font-semibold">In progress</h3>
          <ul className="mt-4 space-y-4">
            {active.map((q) => (
              <JobCard key={q.id} quote={q} />
            ))}
          </ul>
        </>
      )}

      {done.length > 0 && (
        <>
          <div className="mt-8 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-display text-lg font-semibold">Completed</h3>
            <p className="text-sm text-paper/60">
              {done.length} job{done.length > 1 ? 's' : ''} · {formatEur(totalValue)} total value
            </p>
          </div>
          <ul className="mt-4 space-y-4">
            {done.map((q) => (
              <JobCard key={q.id} quote={q} />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

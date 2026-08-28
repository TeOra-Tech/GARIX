'use client';

import { useParams } from 'next/navigation';
import { useGarageAnalytics } from '@/lib/garage-pro/queries';
import { ProGate } from '@/components/garages/pro-gate';
import { formatEur } from '@/lib/vat';

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-hex border border-ink-line bg-ink-soft p-5">
      <p className="text-xs uppercase tracking-wide text-paper/40">{label}</p>
      <p className="mt-1 font-display text-3xl font-extrabold">{value}</p>
      {sub && <p className="mt-1 text-xs text-paper/50">{sub}</p>}
    </div>
  );
}

function AnalyticsBody({ garageId }: { garageId: string }) {
  const a = useGarageAnalytics(garageId);

  if (a.isPending) return <p className="mt-6 text-paper/60">Loading analytics…</p>;
  if (a.isError || !a.data)
    return <p role="alert" className="mt-6 text-danger">Could not load analytics. Refresh to try again.</p>;

  const d = a.data;
  const acceptRate = d.quotes_total > 0 ? Math.round((d.quotes_accepted / d.quotes_total) * 100) : 0;

  return (
    <div className="mt-6 space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Quotes sent" value={String(d.quotes_total)} sub={`${d.quotes_30d} in the last 30 days`} />
        <Stat label="Acceptance rate" value={`${acceptRate}%`} sub={`${d.quotes_accepted} accepted`} />
        <Stat label="Jobs completed" value={String(d.jobs_completed)} />
        <Stat label="Completed job value" value={formatEur(Number(d.total_job_value))} />
        <Stat label="Avg quote value" value={formatEur(Number(d.avg_quote_value))} />
        <Stat label="Customers" value={String(d.customers)} sub="with an accepted job" />
        <Stat
          label="Rating"
          value={d.review_count > 0 ? `★ ${Number(d.avg_rating).toFixed(1)}` : '—'}
          sub={`${d.review_count} review${d.review_count === 1 ? '' : 's'}`}
        />
        <Stat label="Credits spent" value={String(d.credits_spent)} sub="on quotes to date" />
        <Stat label="Upcoming bookings" value={String(d.bookings_upcoming)} />
      </div>
      <p className="text-xs text-paper/40">
        Figures update in real time from your quotes, jobs and reviews.
      </p>
    </div>
  );
}

export default function GarageAnalyticsPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <section className="py-8">
      <h2 className="font-display text-2xl font-bold">Analytics</h2>
      <p className="mt-1 text-sm text-paper/60">Your garage&rsquo;s performance at a glance.</p>
      <ProGate
        garageId={id}
        feature="Analytics"
        body="Track quotes, acceptance rate, completed job value, ratings and more."
      >
        <AnalyticsBody garageId={id} />
      </ProGate>
    </section>
  );
}

'use client';

import Link from 'next/link';
import { usePlatformStats } from '@/lib/admin/queries';
import { formatEur } from '@/lib/vat';

export default function AdminOverviewPage() {
  const stats = usePlatformStats();

  const cards = stats.data
    ? [
        { label: 'Registered users', value: stats.data.users, href: '/admin/users' },
        { label: 'Active garages', value: stats.data.activeGarages, href: '/admin/garages' },
        { label: 'Awaiting approval', value: stats.data.pendingGarages, href: '/admin/garages?status=pending_verification', highlight: stats.data.pendingGarages > 0 },
        { label: 'Service requests', value: stats.data.requests, href: '/admin' },
        { label: 'Quotes submitted', value: stats.data.quotes, href: '/admin' },
        { label: 'Credit revenue', value: formatEur(stats.data.revenueEur), href: '/admin' },
      ]
    : [];

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-3xl font-bold">Operations overview</h1>
      {stats.isPending && <p className="mt-8 text-paper/60">Loading platform stats…</p>}
      {stats.isError && <p role="alert" className="mt-8 text-signal">Could not load stats.</p>}
      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className={
              'rounded-hex border p-6 transition hover:border-volt ' +
              (c.highlight ? 'border-signal/50 bg-signal/10' : 'border-ink-line bg-ink-soft')
            }
          >
            <p className="font-display text-3xl font-extrabold">{c.value}</p>
            <p className="mt-1 text-sm text-paper/60">{c.label}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}

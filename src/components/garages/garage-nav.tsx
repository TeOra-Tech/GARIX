'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

/** Per-garage dashboard tabs, ordered by day-to-day priority. */
const TABS = [
  { path: '', label: 'Request feed' },
  { path: '/quotes', label: 'Quotes' },
  { path: '/jobs', label: 'Jobs' },
  { path: '/bookings', label: 'Bookings' },
  { path: '/messages', label: 'Messages' },
  { path: '/customers', label: 'Customers' },
  { path: '/reminders', label: 'Reminders' },
  { path: '/service-records', label: 'Service history' },
  { path: '/analytics', label: 'Analytics' },
  { path: '/wallet', label: 'Wallet' },
  { path: '/reviews', label: 'Reviews' },
  { path: '/plan', label: 'Plan' },
  { path: '/profile', label: 'Public profile' },
];

export function GarageNav({ garageId }: { garageId: string }) {
  const pathname = usePathname();
  const base = `/dashboard/garages/${garageId}`;
  return (
    <nav
      aria-label="Garage sections"
      className="mb-4 border-b border-ink-line pb-2 md:sticky md:top-24 md:mb-0 md:border-b-0 md:pb-0"
    >
      <ul className="flex gap-1 overflow-x-auto text-sm md:flex-col md:gap-0.5 md:overflow-visible">
        {TABS.map((t) => {
          const href = base + t.path;
          const active =
            t.path === ''
              ? pathname === base || pathname.startsWith(`${base}/requests`)
              : pathname.startsWith(href);
          return (
            <li key={t.path}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'block whitespace-nowrap rounded-lg px-3 py-2 transition md:w-full',
                  active
                    ? 'bg-volt/10 font-medium text-volt-bright'
                    : 'text-paper/60 hover:bg-ink-soft hover:text-paper',
                )}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

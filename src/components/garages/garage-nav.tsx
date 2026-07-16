'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

/** Per-garage dashboard tabs, ordered by day-to-day priority. */
const TABS = [
  { path: '', label: 'Request feed' },
  { path: '/quotes', label: 'Quotes' },
  { path: '/jobs', label: 'Jobs' },
  { path: '/messages', label: 'Messages' },
  { path: '/customers', label: 'Customers' },
  { path: '/wallet', label: 'Wallet' },
  { path: '/reviews', label: 'Reviews' },
  { path: '/profile', label: 'Public profile' },
];

export function GarageNav({ garageId }: { garageId: string }) {
  const pathname = usePathname();
  const base = `/dashboard/garages/${garageId}`;
  return (
    <nav aria-label="Garage sections" className="overflow-x-auto border-b border-ink-line">
      <ul className="flex gap-1 text-sm">
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
                  'block whitespace-nowrap border-b-2 px-3 py-2.5 transition',
                  active
                    ? 'border-volt text-volt-bright'
                    : 'border-transparent text-paper/60 hover:text-paper',
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

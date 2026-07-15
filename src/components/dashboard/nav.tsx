'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const CUSTOMER_TABS = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/vehicles', label: 'My vehicles' },
  { href: '/requests/new', label: 'New request' },
  { href: '/dashboard/requests', label: 'My requests' },
  { href: '/dashboard/messages', label: 'Messages' },
];

const GARAGE_TABS = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/garage', label: 'My garage' },
  { href: '/dashboard/garage/requests', label: 'Request feed' },
  { href: '/dashboard/wallet', label: 'Wallet' },
  { href: '/dashboard/garage/reviews', label: 'Reviews' },
  { href: '/dashboard/messages', label: 'Messages' },
];

export function DashboardNav({ role }: { role: string }) {
  const pathname = usePathname();
  const tabs = role === 'garage_owner' ? GARAGE_TABS : CUSTOMER_TABS;
  return (
    <nav aria-label="Dashboard sections" className="mx-auto max-w-6xl overflow-x-auto px-4">
      <ul className="flex gap-1 text-sm">
        {tabs.map((t) => {
          const active =
            t.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(t.href) &&
                // "/dashboard/garage" must not light up on "/dashboard/garage/requests"
                !tabs.some((o) => o.href.length > t.href.length && pathname.startsWith(o.href));
          return (
            <li key={t.href}>
              <Link
                href={t.href}
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

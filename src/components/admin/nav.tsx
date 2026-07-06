'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/garages', label: 'Garages' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/reviews', label: 'Reviews' },
  { href: '/admin/disputes', label: 'Disputes' },
  { href: '/admin/settings', label: 'Settings' },
  { href: '/admin/audit', label: 'Audit log' },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin sections" className="mx-auto max-w-6xl overflow-x-auto px-4">
      <ul className="flex gap-1 text-sm">
        {TABS.map((t) => {
          const active = t.href === '/admin' ? pathname === '/admin' : pathname.startsWith(t.href);
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

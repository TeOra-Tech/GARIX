'use client';

import { usePathname } from 'next/navigation';
import { SiteHeader } from './site-header';

// Areas with their own header/navigation chrome — no marketing header there.
const HIDE_PREFIXES = ['/dashboard', '/admin', '/auth'];

/** Renders the persistent public header everywhere except the app areas. */
export function SiteChrome() {
  const pathname = usePathname();
  if (HIDE_PREFIXES.some((p) => pathname.startsWith(p))) return null;
  return <SiteHeader />;
}

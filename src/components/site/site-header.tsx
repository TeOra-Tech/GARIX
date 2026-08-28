'use client';

import Image from 'next/image';
import Link from 'next/link';

/** Persistent public-site header (landing + all marketing/entry pages). */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3" aria-label="Main">
        <Link href="/" aria-label="Garix home" className="flex items-center">
          <Image src="/logo-horizontal.png" alt="Garix" width={150} height={37} priority className="h-9 w-auto" />
        </Link>
        <div className="hidden items-center gap-7 text-sm font-medium text-charcoal/70 md:flex">
          <Link href="/#for-drivers" className="transition hover:text-navy">For personal</Link>
          <Link href="/for-business" className="transition hover:text-navy">For business</Link>
          <Link href="/garages/register" className="transition hover:text-navy">For garages</Link>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/auth/login" className="text-sm font-medium text-navy transition hover:text-navy-soft">
            Log in
          </Link>
          <Link href="/auth/register" className="btn-primary !px-5 !py-2.5 text-sm">Sign up</Link>
        </div>
      </nav>
    </header>
  );
}

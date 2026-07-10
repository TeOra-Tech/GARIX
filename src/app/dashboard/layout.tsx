import Image from 'next/image';
import Link from 'next/link';
import { SignOutButton } from '@/components/auth/sign-out-button';
import { NotificationBell } from '@/components/notifications/bell';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-ink-line bg-ink/90 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3" aria-label="Dashboard">
          <Link href="/dashboard" className="flex items-center gap-2 font-display text-xl font-bold tracking-wide">
            <Image src="/brand-mark.png" alt="Garix" width={36} height={36} priority />
            GARIX
          </Link>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <SignOutButton />
          </div>
        </nav>
      </header>
      {children}
    </div>
  );
}

import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth/server';
import { SignOutButton } from '@/components/auth/sign-out-button';
import { AdminNav } from '@/components/admin/nav';

export const metadata = { title: 'Admin' };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionProfile();
  if (!session) redirect('/auth/login?next=/admin');
  // Middleware gates this too, but the layout must not rely on it.
  if (session.profile.role !== 'admin') redirect('/dashboard');

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-ink-line bg-ink/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/admin" className="flex items-center gap-2 font-display text-xl font-bold tracking-wide">
            <Image src="/logo.png" alt="Garix" width={40} height={40} className="rounded" priority />
            GARIX
            <span className="rounded-full border border-signal/50 px-2 py-0.5 text-xs font-semibold text-signal-soft">
              ADMIN
            </span>
          </Link>
          <SignOutButton />
        </div>
        <AdminNav />
      </header>
      {children}
    </div>
  );
}

import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth/server';
import { SignOutButton } from '@/components/auth/sign-out-button';

export const metadata = { title: 'Admin' };

export default async function AdminPage() {
  const session = await getSessionProfile();
  if (!session) redirect('/auth/login?next=/admin');
  // Middleware already gates this, but the page must not rely on it.
  if (session.profile.role !== 'admin') redirect('/dashboard');

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-signal">Admin</p>
          <h1 className="mt-2 font-display text-3xl font-bold md:text-4xl">Operations</h1>
        </div>
        <SignOutButton />
      </div>
      <p className="mt-6 max-w-xl text-paper/60">
        Garage approval queue, user management, moderation, and settings land here
        (roadmap item 11). You&rsquo;re signed in as {session.profile.email}.
      </p>
    </main>
  );
}

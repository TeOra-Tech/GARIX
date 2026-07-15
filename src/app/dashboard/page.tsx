import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth/server';
import { CustomerOverview } from '@/components/dashboard/customer-overview';

export const metadata = { title: 'Dashboard' };

const garageLinks = [
  { href: '/dashboard/garage', title: 'My garage', body: 'Manage your profile, services, hours and gallery.' },
  { href: '/dashboard/garage/requests', title: 'Request feed', body: 'Browse open repair requests and send quotes.' },
  { href: '/dashboard/wallet', title: 'Credit wallet', body: 'Top up credits and track your spending.' },
  { href: '/dashboard/garage/reviews', title: 'Reviews', body: 'Read and respond to customer reviews.' },
  { href: '/dashboard/messages', title: 'Messages', body: 'Chat with customers about their jobs.' },
];

export default async function DashboardPage() {
  const session = await getSessionProfile();
  if (!session) redirect('/auth/login?next=/dashboard');
  const { profile } = session;
  if (profile.role === 'admin') redirect('/admin');

  const firstName = profile.full_name?.split(' ')[0] || 'there';
  const isGarage = profile.role === 'garage_owner';

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <p className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-gold-ink">
        {isGarage ? 'Garage dashboard' : 'Your dashboard'}
      </p>
      <h1 className="mt-2 font-display text-3xl font-bold md:text-4xl">Hi {firstName}</h1>
      {!profile.mobile_number && (
        <p className="mt-4 rounded-lg border border-volt/40 bg-volt/10 p-3 text-sm text-paper/80">
          Your profile is missing a mobile number — garages use it to reach you about bookings.
        </p>
      )}

      {isGarage ? (
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {garageLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-hex border border-ink-line bg-ink-soft p-6 transition hover:border-volt"
            >
              <h2 className="font-display text-lg font-semibold text-volt-bright">{l.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-paper/60">{l.body}</p>
            </Link>
          ))}
        </div>
      ) : (
        <CustomerOverview />
      )}
    </main>
  );
}

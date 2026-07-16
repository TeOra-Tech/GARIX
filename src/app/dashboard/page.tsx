import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth/server';
import { CustomerOverview } from '@/components/dashboard/customer-overview';
import { GarageOverview } from '@/components/dashboard/garage-overview';

export const metadata = { title: 'Dashboard' };

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

      {isGarage ? <GarageOverview /> : <CustomerOverview />}
    </main>
  );
}

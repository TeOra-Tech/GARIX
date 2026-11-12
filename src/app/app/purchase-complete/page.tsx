import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Back to the Garix app', robots: { index: false } };

/** Stripe sends purchases started in the mobile app here; the button reopens the app. */
export default async function AppPurchaseCompletePage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const success = status === 'success';
  return (
    <main className="mx-auto max-w-xl px-4 py-20 text-center">
      <h1 className="font-display text-3xl font-bold">{success ? 'Payment complete' : 'Payment cancelled'}</h1>
      <p className="mt-4 text-paper/70">
        {success
          ? 'Thanks — your purchase is being added to your garage now. Go back to the Garix app to carry on.'
          : 'You haven’t been charged. Go back to the Garix app to carry on.'}
      </p>
      <a href="garix://garage/account" className="btn-primary mt-8 inline-flex">
        Open the Garix app
      </a>
    </main>
  );
}

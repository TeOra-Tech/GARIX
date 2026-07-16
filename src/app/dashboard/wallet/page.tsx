'use client';

import { Suspense, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMyGarages } from '@/lib/garages/portal';

/**
 * The wallet moved inside each garage's dashboard. This route survives only
 * for old links and in-flight Stripe return URLs — it forwards to the first
 * garage's wallet, preserving the ?purchase= outcome.
 */
function WalletRedirect() {
  const router = useRouter();
  const params = useSearchParams();
  const garages = useMyGarages();

  useEffect(() => {
    if (!garages.isSuccess) return;
    const first = garages.data[0];
    if (first) {
      const qs = params.toString();
      router.replace(`/dashboard/garages/${first.id}/wallet${qs ? `?${qs}` : ''}`);
    }
  }, [garages.isSuccess, garages.data, params, router]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      {garages.isSuccess && garages.data.length === 0 ? (
        <div className="rounded-hex border border-ink-line bg-ink-soft p-8">
          <p className="text-paper/70">The wallet belongs to your garage — register one first.</p>
          <Link href="/garages/register" className="btn-primary mt-6 inline-flex">Register your garage</Link>
        </div>
      ) : (
        <p className="text-paper/60">Taking you to your garage wallet…</p>
      )}
    </main>
  );
}

export default function Page() {
  return (
    <Suspense>
      <WalletRedirect />
    </Suspense>
  );
}

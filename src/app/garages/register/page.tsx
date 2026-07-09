'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useCreateGarage, useMyGarage } from '@/lib/garages/queries';
import { GarageForm } from '@/components/garages/garage-form';

export default function RegisterGaragePage() {
  const router = useRouter();
  const [authState, setAuthState] = useState<'checking' | 'anonymous' | 'authed'>('checking');
  const myGarage = useMyGarage();
  const create = useCreateGarage();

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data: { user } }) => setAuthState(user ? 'authed' : 'anonymous'));
  }, []);

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <p className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-gold-ink">
        For garages
      </p>
      <h1 className="mt-2 font-display text-3xl font-bold md:text-4xl">Register your garage</h1>
      <p className="mt-3 text-paper/60">
        Free to register. Once our team verifies your details, matching repair requests
        in your radius land in your feed and you quote for the jobs you want —
        2 credits per quote, 1 credit is &euro;1.
      </p>

      {authState === 'checking' && <p className="mt-10 text-paper/60">Checking your account…</p>}

      {authState === 'anonymous' && (
        <div className="mt-10 rounded-hex border border-ink-line bg-ink-soft p-8">
          <p className="text-paper/80">First, create a Garix account (or log in) — it takes a minute.</p>
          <div className="mt-6 flex flex-wrap gap-4">
            <Link href="/auth/register?next=/garages/register" className="btn-primary">
              Create an account
            </Link>
            <Link href="/auth/login?next=/garages/register" className="btn-ghost">
              Log in
            </Link>
          </div>
        </div>
      )}

      {authState === 'authed' && myGarage.data && (
        <div className="mt-10 rounded-hex border border-ink-line bg-ink-soft p-8">
          <p className="text-paper/80">
            You&rsquo;ve already registered <span className="font-semibold">{myGarage.data.name}</span>
            {myGarage.data.status === 'pending_verification' && ' — it’s awaiting verification.'}
          </p>
          <Link href="/dashboard/garage" className="btn-primary mt-6 inline-flex">
            Manage your garage
          </Link>
        </div>
      )}

      {authState === 'authed' && myGarage.isSuccess && !myGarage.data && (
        <div className="mt-10">
          <GarageForm
            requirePoint
            submitLabel="Register garage — free"
            pending={create.isPending}
            serverError={create.isError ? 'Could not register the garage. Check the form and try again.' : null}
            onSubmit={(data) =>
              create.mutate(data, { onSuccess: () => router.push('/dashboard/garage?registered=1') })
            }
          />
        </div>
      )}
    </main>
  );
}

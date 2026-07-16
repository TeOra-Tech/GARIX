'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useCreateGarage } from '@/lib/garages/queries';
import { useMyGarages } from '@/lib/garages/portal';
import { GarageForm } from '@/components/garages/garage-form';

export default function RegisterGaragePage() {
  const router = useRouter();
  const [authState, setAuthState] = useState<'checking' | 'anonymous' | 'authed'>('checking');
  const myGarages = useMyGarages();
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

      {authState === 'authed' && myGarages.isSuccess && (
        <div className="mt-10">
          {myGarages.data.length > 0 && (
            <p className="mb-6 rounded-lg border border-ink-line bg-ink-soft p-4 text-sm text-paper/70">
              You already run{' '}
              <span className="font-semibold">
                {myGarages.data.map((g) => g.name).join(', ')}
              </span>{' '}
              — registering here adds another garage to your account.{' '}
              <Link href="/dashboard/garages" className="text-volt-bright hover:underline">
                My garages
              </Link>
            </p>
          )}
          <GarageForm
            requirePoint
            submitLabel="Register garage — free"
            pending={create.isPending}
            serverError={create.isError ? 'Could not register the garage. Check the form and try again.' : null}
            onSubmit={(data) =>
              create.mutate(data, {
                onSuccess: (garage) => router.push(`/dashboard/garages/${garage.id}/profile?registered=1`),
              })
            }
          />
        </div>
      )}
    </main>
  );
}

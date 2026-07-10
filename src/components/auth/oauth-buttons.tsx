'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Provider = 'google' | 'apple';

export function OAuthButtons({ next }: { next?: string | null }) {
  const [pending, setPending] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function signIn(provider: Provider) {
    setPending(provider);
    setError(null);
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback${
      next ? `?next=${encodeURIComponent(next)}` : ''
    }`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    });
    if (error) {
      setError(`Could not start ${provider === 'google' ? 'Google' : 'Apple'} sign-in. Try again.`);
      setPending(null);
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        className="btn-ghost w-full"
        onClick={() => signIn('google')}
        disabled={pending !== null}
      >
        {pending === 'google' ? 'Redirecting…' : 'Continue with Google'}
      </button>
      <button
        type="button"
        className="btn-ghost w-full"
        onClick={() => signIn('apple')}
        disabled={pending !== null}
      >
        {pending === 'apple' ? 'Redirecting…' : 'Continue with Apple'}
      </button>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

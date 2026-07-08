'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { emailSchema, otpSchema } from '@/lib/validation/auth';
import { roleHome, safeNext } from '@/lib/auth/roles';
import { OAuthButtons } from '@/components/auth/oauth-buttons';
import { Field, inputCls } from '@/components/auth/field';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get('next'));
  const callbackFailed = searchParams.get('error') === 'callback';

  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setPending(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: parsed.data,
      options: { shouldCreateUser: false },
    });
    setPending(false);
    if (error) {
      setError(
        /signups not allowed/i.test(error.message)
          ? 'No account found for that email — create one below.'
          : 'Could not send the code. Wait a moment and try again.',
      );
      return;
    }
    setEmail(parsed.data);
    setStep('code');
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = otpSchema.safeParse(code);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setPending(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: parsed.data,
      type: 'email',
    });
    if (error || !data.user) {
      setPending(false);
      setError('That code is wrong or has expired. Request a new one.');
      return;
    }
    if (next) {
      router.replace(next);
      return;
    }
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', data.user.id)
      .single();
    router.replace(roleHome(profile?.role));
  }

  return (
    <main className="mx-auto max-w-md px-4 py-20">
      <h1 className="font-display text-4xl font-bold">Log in</h1>
      <p className="mt-2 text-paper/60">
        We&rsquo;ll email you a one-time code — no password needed.
      </p>

      {callbackFailed && (
        <p role="alert" className="mt-4 rounded-lg border border-signal/40 bg-signal/10 p-3 text-sm text-signal-soft">
          Sign-in didn&rsquo;t complete. Try again.
        </p>
      )}

      {step === 'email' ? (
        <form onSubmit={requestCode} className="mt-8 space-y-4" noValidate>
          <Field label="Email address" htmlFor="email" error={error ?? undefined}>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              className={inputCls}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.ie"
            />
          </Field>
          <button type="submit" className="btn-primary w-full" disabled={pending}>
            {pending ? 'Sending code…' : 'Email me a code'}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyCode} className="mt-8 space-y-4" noValidate>
          <p className="text-sm text-paper/60">
            Check <span className="font-medium text-paper">{email}</span> — click the sign-in link
            in the email, or enter the code below if your email includes one.{' '}
            <button type="button" className="underline hover:text-volt-bright" onClick={() => { setStep('email'); setCode(''); setError(null); }}>
              Change email
            </button>
          </p>
          <Field label="Verification code" htmlFor="code" error={error ?? undefined}>
            <input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={10}
              required
              className={inputCls}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
            />
          </Field>
          <button type="submit" className="btn-primary w-full" disabled={pending}>
            {pending ? 'Checking…' : 'Log in'}
          </button>
        </form>
      )}

      <div className="my-8 flex items-center gap-4 text-xs uppercase tracking-widest text-paper/40">
        <span className="h-px flex-1 bg-ink-line" aria-hidden />
        or
        <span className="h-px flex-1 bg-ink-line" aria-hidden />
      </div>

      <OAuthButtons next={next} />

      <p className="mt-8 text-sm text-paper/60">
        New to Garix?{' '}
        <Link href="/auth/register" className="text-volt-bright hover:underline">
          Create an account
        </Link>
      </p>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

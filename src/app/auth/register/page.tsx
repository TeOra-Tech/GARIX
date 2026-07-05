'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { registerSchema, otpSchema, IRISH_COUNTIES, type RegisterData } from '@/lib/validation/auth';
import { OAuthButtons } from '@/components/auth/oauth-buttons';
import { Field, inputCls } from '@/components/auth/field';

type FormState = {
  fullName: string;
  email: string;
  mobile: string;
  line1: string;
  line2: string;
  town: string;
  county: string;
  eircode: string;
  termsAccepted: boolean;
  marketingOptIn: boolean;
};

const EMPTY: FormState = {
  fullName: '', email: '', mobile: '', line1: '', line2: '', town: '',
  county: '', eircode: '', termsAccepted: false, marketingOptIn: false,
};

export default function Page() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [validated, setValidated] = useState<RegisterData | null>(null);
  const [step, setStep] = useState<'details' | 'code'>('details');
  const [code, setCode] = useState('');
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submitDetails(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const parsed = registerSchema.safeParse({
      fullName: form.fullName,
      email: form.email,
      mobile: form.mobile,
      address: {
        line1: form.line1,
        line2: form.line2,
        town: form.town,
        county: form.county,
        eircode: form.eircode,
      },
      termsAccepted: form.termsAccepted,
      marketingOptIn: form.marketingOptIn,
    });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join('.');
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setPending(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: parsed.data.email,
      options: {
        shouldCreateUser: true,
        data: { full_name: parsed.data.fullName, role: 'customer' },
      },
    });
    setPending(false);
    if (error) {
      setFormError('Could not send the verification code. Wait a moment and try again.');
      return;
    }
    setValidated(parsed.data);
    setStep('code');
  }

  async function verifyAndSave(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const parsedCode = otpSchema.safeParse(code);
    if (!parsedCode.success) {
      setFormError(parsedCode.error.issues[0].message);
      return;
    }
    if (!validated) return;
    setPending(true);
    const supabase = createClient();

    const { data, error } = await supabase.auth.verifyOtp({
      email: validated.email,
      token: parsedCode.data,
      type: 'email',
    });
    if (error || !data.user) {
      setPending(false);
      setFormError('That code is wrong or has expired. Request a new one.');
      return;
    }

    // Profile row exists via the handle_new_user trigger; add what the form collected.
    const [profileRes, addressRes] = await Promise.all([
      supabase
        .from('user_profiles')
        .update({
          full_name: validated.fullName,
          mobile_number: validated.mobile,
          marketing_opt_in: validated.marketingOptIn,
          terms_accepted_at: new Date().toISOString(),
          email_verified: true,
        })
        .eq('id', data.user.id),
      supabase.from('user_addresses').insert({
        user_id: data.user.id,
        line1: validated.address.line1,
        line2: validated.address.line2 || null,
        town: validated.address.town,
        county: validated.address.county,
        eircode: validated.address.eircode || null,
        is_default: true,
      }),
    ]);
    setPending(false);
    if (profileRes.error || addressRes.error) {
      setFormError(
        'Your account was created but we could not save all your details. You can finish them from your dashboard.',
      );
      setTimeout(() => router.replace('/dashboard'), 2500);
      return;
    }
    router.replace('/dashboard');
  }

  return (
    <main className="mx-auto max-w-md px-4 py-20">
      <h1 className="font-display text-4xl font-bold">Create your account</h1>

      {step === 'details' ? (
        <>
          <p className="mt-2 text-paper/60">
            Post repair requests, compare VAT-itemised quotes, and book trusted garages.
          </p>
          <form onSubmit={submitDetails} className="mt-8 space-y-4" noValidate>
            <Field label="Full name" htmlFor="fullName" error={errors['fullName']}>
              <input id="fullName" autoComplete="name" required className={inputCls}
                value={form.fullName} onChange={(e) => set('fullName', e.target.value)} />
            </Field>
            <Field label="Email address" htmlFor="email" error={errors['email']}>
              <input id="email" type="email" autoComplete="email" required className={inputCls}
                value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="you@example.ie" />
            </Field>
            <Field label="Mobile number" htmlFor="mobile" error={errors['mobile']}>
              <input id="mobile" type="tel" autoComplete="tel" required className={inputCls}
                value={form.mobile} onChange={(e) => set('mobile', e.target.value)} placeholder="087 123 4567" />
            </Field>

            <fieldset className="space-y-4 rounded-lg border border-ink-line p-4">
              <legend className="px-1 text-sm font-medium text-paper/80">Address</legend>
              <Field label="Address line 1" htmlFor="line1" error={errors['address.line1']}>
                <input id="line1" autoComplete="address-line1" required className={inputCls}
                  value={form.line1} onChange={(e) => set('line1', e.target.value)} />
              </Field>
              <Field label="Address line 2 (optional)" htmlFor="line2" error={errors['address.line2']}>
                <input id="line2" autoComplete="address-line2" className={inputCls}
                  value={form.line2} onChange={(e) => set('line2', e.target.value)} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Town or city" htmlFor="town" error={errors['address.town']}>
                  <input id="town" autoComplete="address-level2" required className={inputCls}
                    value={form.town} onChange={(e) => set('town', e.target.value)} />
                </Field>
                <Field label="County" htmlFor="county" error={errors['address.county']}>
                  <select id="county" required className={inputCls}
                    value={form.county} onChange={(e) => set('county', e.target.value)}>
                    <option value="">Choose…</option>
                    {IRISH_COUNTIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Eircode (optional)" htmlFor="eircode" error={errors['address.eircode']}>
                <input id="eircode" autoComplete="postal-code" className={inputCls}
                  value={form.eircode} onChange={(e) => set('eircode', e.target.value)} placeholder="D02 X285" />
              </Field>
            </fieldset>

            <div className="space-y-3">
              <label className="flex items-start gap-3 text-sm text-paper/80">
                <input type="checkbox" className="mt-0.5 h-4 w-4 accent-volt"
                  checked={form.termsAccepted} onChange={(e) => set('termsAccepted', e.target.checked)} />
                <span>
                  I accept the{' '}
                  <Link href="/legal/terms" className="text-volt-bright hover:underline" target="_blank">terms of service</Link>{' '}
                  and{' '}
                  <Link href="/legal/privacy" className="text-volt-bright hover:underline" target="_blank">privacy policy</Link>
                </span>
              </label>
              {errors['termsAccepted'] && (
                <p role="alert" className="text-sm text-signal">{errors['termsAccepted']}</p>
              )}
              <label className="flex items-start gap-3 text-sm text-paper/60">
                <input type="checkbox" className="mt-0.5 h-4 w-4 accent-volt"
                  checked={form.marketingOptIn} onChange={(e) => set('marketingOptIn', e.target.checked)} />
                <span>Send me occasional offers and product updates (optional)</span>
              </label>
            </div>

            {formError && <p role="alert" className="text-sm text-signal">{formError}</p>}

            <button type="submit" className="btn-primary w-full" disabled={pending}>
              {pending ? 'Sending code…' : 'Continue'}
            </button>
          </form>

          <div className="my-8 flex items-center gap-4 text-xs uppercase tracking-widest text-paper/40">
            <span className="h-px flex-1 bg-ink-line" aria-hidden />
            or
            <span className="h-px flex-1 bg-ink-line" aria-hidden />
          </div>
          <OAuthButtons />
          <p className="mt-8 text-sm text-paper/60">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-volt-bright hover:underline">Log in</Link>
          </p>
          <p className="mt-2 text-sm text-paper/60">
            Run a garage?{' '}
            <Link href="/garages/register" className="text-volt-bright hover:underline">Register it here</Link>
          </p>
        </>
      ) : (
        <form onSubmit={verifyAndSave} className="mt-8 space-y-4" noValidate>
          <p className="text-sm text-paper/60">
            We emailed a 6-digit code to{' '}
            <span className="font-medium text-paper">{validated?.email}</span>.{' '}
            <button type="button" className="underline hover:text-volt-bright"
              onClick={() => { setStep('details'); setCode(''); setFormError(null); }}>
              Change details
            </button>
          </p>
          <Field label="6-digit code" htmlFor="code" error={formError ?? undefined}>
            <input id="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required
              className={inputCls} value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" />
          </Field>
          <button type="submit" className="btn-primary w-full" disabled={pending}>
            {pending ? 'Creating account…' : 'Verify and create account'}
          </button>
        </form>
      )}
    </main>
  );
}

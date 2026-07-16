'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/client';
import { Field, inputCls } from '@/components/auth/field';

const accountSchema = z.object({
  fullName: z.string().trim().min(2, 'Your full name is required').max(120),
  mobileNumber: z
    .string()
    .trim()
    .regex(/^(\+?[0-9 -]{7,16})?$/, 'Enter a valid mobile number')
    .optional()
    .or(z.literal('')),
});

function useMyProfile() {
  return useQuery({
    queryKey: ['user_profiles', 'me'],
    queryFn: async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in');
      const { data, error } = await supabase.from('user_profiles').select('*').eq('id', user.id).single();
      if (error) throw error;
      return data;
    },
  });
}

export default function AccountPage() {
  const profile = useMyProfile();
  const qc = useQueryClient();
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile.data) {
      setFullName(profile.data.full_name ?? '');
      setMobile(profile.data.mobile_number ?? '');
    }
  }, [profile.data]);

  const save = useMutation({
    mutationFn: async (v: { fullName: string; mobileNumber?: string }) => {
      const { error: err } = await createClient()
        .from('user_profiles')
        .update({ full_name: v.fullName, mobile_number: v.mobileNumber || null })
        .eq('id', profile.data!.id);
      if (err) throw err;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user_profiles', 'me'] }),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = accountSchema.safeParse({ fullName, mobileNumber: mobile });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setError(null);
    save.mutate(parsed.data);
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-display text-3xl font-bold">Account details</h1>

      {profile.isPending && <p className="mt-8 text-paper/60">Loading your account…</p>}
      {profile.isError && (
        <p role="alert" className="mt-8 text-danger">Could not load your account. Refresh to try again.</p>
      )}

      {profile.data && (
        <>
          <form onSubmit={submit} className="mt-8 space-y-4 rounded-hex border border-ink-line bg-ink-soft p-6" noValidate>
            <Field label="Full name" htmlFor="acc-name" error={error ?? undefined}>
              <input id="acc-name" className={inputCls} value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </Field>
            <Field label="Mobile number" htmlFor="acc-mobile">
              <input
                id="acc-mobile"
                type="tel"
                className={inputCls}
                placeholder="+353 87 123 4567"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
              />
            </Field>
            <Field label="Email" htmlFor="acc-email">
              <input id="acc-email" className={inputCls} value={profile.data.email} disabled aria-readonly />
            </Field>
            <p className="text-xs text-paper/50">
              Your email is your sign-in and can&rsquo;t be changed here — contact support if it needs updating.
            </p>
            {save.isError && (
              <p role="alert" className="text-sm text-danger">Could not save your details. Try again.</p>
            )}
            {save.isSuccess && !save.isPending && <p className="text-sm text-success">Saved.</p>}
            <button type="submit" className="btn-primary" disabled={save.isPending}>
              {save.isPending ? 'Saving…' : 'Save changes'}
            </button>
          </form>

          <section className="mt-6 rounded-hex border border-ink-line bg-ink-soft p-6">
            <h2 className="font-display text-lg font-semibold">Notifications</h2>
            <p className="mt-2 text-sm text-paper/60">
              Choose how Garix reaches you — in-app, email or SMS.
            </p>
            <Link href="/dashboard/notifications" className="btn-ghost mt-4 inline-flex !px-4 !py-2 text-sm">
              Notification preferences
            </Link>
          </section>
        </>
      )}
    </main>
  );
}

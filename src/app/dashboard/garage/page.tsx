'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  garagePhotoUrl,
  useAddCertification,
  useAddGaragePhoto,
  useMyGarage,
  useRemoveCertification,
  useRemoveGaragePhoto,
  useUpdateGarage,
} from '@/lib/garages/queries';
import { certificationSchema } from '@/lib/validation/garage';
import { GarageForm } from '@/components/garages/garage-form';
import { Field, inputCls } from '@/components/auth/field';

const STATUS_COPY: Record<string, string> = {
  pending_verification: 'Awaiting verification — our team is reviewing your details. You can polish your profile meanwhile.',
  pending_approval: 'Verification done — final approval pending.',
  active: 'Your garage is live and receiving matching requests.',
  suspended: 'Your garage is suspended. Contact support.',
  rejected: 'Your registration was rejected. Contact support for details.',
};

function PhotosSection({ garageId, photos }: { garageId: string; photos: { id: string; storage_path: string; caption: string | null; garage_id: string; sort_order: number; created_at: string }[] }) {
  const add = useAddGaragePhoto(garageId);
  const remove = useRemoveGaragePhoto(garageId);
  return (
    <section className="mt-12 space-y-4">
      <h2 className="font-display text-2xl font-bold">Gallery</h2>
      <input
        type="file"
        accept="image/*"
        aria-label="Add a photo"
        className="block w-full text-sm text-paper/70 file:mr-4 file:rounded-lg file:border-0 file:bg-volt file:px-4 file:py-2 file:font-display file:font-semibold file:text-white hover:file:bg-volt-bright"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) add.mutate(f);
          e.target.value = '';
        }}
      />
      {add.isError && <p role="alert" className="text-sm text-signal">Upload failed. Try a smaller image.</p>}
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {photos.map((p) => (
          <li key={p.id} className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={garagePhotoUrl(p.storage_path)} alt={p.caption ?? ''} className="aspect-square w-full rounded-lg object-cover" />
            <button
              type="button"
              aria-label="Remove photo"
              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-ink/80 text-xs hover:bg-signal hover:text-ink"
              onClick={() => remove.mutate(p)}
            >
              &#10005;
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CertificationsSection({
  garageId,
  certifications,
}: {
  garageId: string;
  certifications: { id: string; name: string; issuing_body: string | null; verified: boolean; expires_at: string | null; document_path: string | null; garage_id: string; created_at: string }[];
}) {
  const add = useAddCertification(garageId);
  const remove = useRemoveCertification();
  const [name, setName] = useState('');
  const [issuingBody, setIssuingBody] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [document_, setDocument] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = certificationSchema.safeParse({ name, issuingBody, expiresAt });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setError(null);
    add.mutate(
      { data: parsed.data, document: document_ },
      { onSuccess: () => { setName(''); setIssuingBody(''); setExpiresAt(''); setDocument(null); } },
    );
  }

  return (
    <section className="mt-12 space-y-4">
      <h2 className="font-display text-2xl font-bold">Certifications</h2>
      <ul className="space-y-2">
        {certifications.map((c) => (
          <li key={c.id} className="flex items-center gap-3 rounded-lg border border-ink-line bg-ink-soft p-4 text-sm">
            <span className="font-medium">{c.name}</span>
            {c.issuing_body && <span className="text-paper/50">— {c.issuing_body}</span>}
            {c.verified ? (
              <span className="rounded-full border border-volt/50 px-2 py-0.5 text-xs text-volt-bright">Verified</span>
            ) : (
              <span className="rounded-full border border-ink-line px-2 py-0.5 text-xs text-paper/40">Pending review</span>
            )}
            <button type="button" className="ml-auto text-xs text-paper/50 underline hover:text-signal"
              onClick={() => remove.mutate(c)}>
              Remove
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={submit} className="space-y-3 rounded-lg border border-ink-line p-4" noValidate>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Certification" htmlFor="certName" error={error ?? undefined}>
            <input id="certName" className={inputCls} value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. SIMI member" />
          </Field>
          <Field label="Issuing body (optional)" htmlFor="certBody">
            <input id="certBody" className={inputCls} value={issuingBody} onChange={(e) => setIssuingBody(e.target.value)} />
          </Field>
          <Field label="Expires (optional)" htmlFor="certExpiry">
            <input id="certExpiry" type="date" className={inputCls} value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
          </Field>
        </div>
        <Field label="Document (optional)" htmlFor="certDoc">
          <input id="certDoc" type="file" accept="image/*,application/pdf"
            className="block w-full text-sm text-paper/70 file:mr-4 file:rounded-lg file:border-0 file:bg-ink-line file:px-4 file:py-2 file:text-paper"
            onChange={(e) => setDocument(e.target.files?.[0] ?? null)} />
        </Field>
        {add.isError && <p role="alert" className="text-sm text-signal">Could not add the certification. Try again.</p>}
        <button type="submit" className="btn-ghost !px-4 !py-2 text-sm" disabled={add.isPending}>
          {add.isPending ? 'Adding…' : 'Add certification'}
        </button>
      </form>
    </section>
  );
}

function GarageManager() {
  const params = useSearchParams();
  const justRegistered = params.get('registered') === '1';
  const garage = useMyGarage();
  const update = useUpdateGarage(garage.data?.id ?? '');

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-display text-3xl font-bold">My garage</h1>

      {garage.isPending && <p className="mt-8 text-paper/60">Loading…</p>}

      {garage.isSuccess && !garage.data && (
        <div className="mt-8 rounded-hex border border-ink-line bg-ink-soft p-8">
          <p className="text-paper/70">You haven&rsquo;t registered a garage yet.</p>
          <Link href="/garages/register" className="btn-primary mt-6 inline-flex">
            Register your garage — free
          </Link>
        </div>
      )}

      {garage.data && (
        <>
          {justRegistered && (
            <p className="mt-6 rounded-lg border border-volt/40 bg-volt/10 p-4 text-sm">
              Registration received! {STATUS_COPY[garage.data.status]}
            </p>
          )}
          <p className="mt-4 rounded-lg border border-ink-line bg-ink-soft p-4 text-sm text-paper/70">
            Status: <span className="font-medium text-paper">{garage.data.status.replace(/_/g, ' ')}</span>
            {!justRegistered && ` — ${STATUS_COPY[garage.data.status]}`}
            {garage.data.status === 'active' && (
              <>
                {' '}
                <Link href={`/garages/${garage.data.slug}`} className="text-volt-bright hover:underline">
                  View public profile
                </Link>
                {' · '}
                <Link href="/dashboard/garage/requests" className="text-volt-bright hover:underline">
                  Request feed
                </Link>
                {' · '}
                <Link href="/dashboard/wallet" className="text-volt-bright hover:underline">
                  Wallet
                </Link>
              </>
            )}
          </p>

          <div className="mt-8">
            <GarageForm
              initial={garage.data}
              submitLabel="Save changes"
              pending={update.isPending}
              serverError={update.isError ? 'Could not save your changes. Try again.' : null}
              onSubmit={(data) => update.mutate(data)}
            />
            {update.isSuccess && <p className="mt-3 text-sm text-volt-bright">Saved.</p>}
          </div>

          <PhotosSection garageId={garage.data.id} photos={garage.data.garage_photos} />
          <CertificationsSection garageId={garage.data.id} certifications={garage.data.garage_certifications} />
        </>
      )}
    </main>
  );
}

export default function Page() {
  return (
    <Suspense>
      <GarageManager />
    </Suspense>
  );
}

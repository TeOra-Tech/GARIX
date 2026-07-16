'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  garagePhotoUrl,
  useAddCertification,
  useAddGaragePhoto,
  useRemoveCertification,
  useRemoveGaragePhoto,
  useUpdateGarage,
} from '@/lib/garages/queries';
import { useOwnedGarage } from '@/lib/garages/portal';
import { certificationSchema } from '@/lib/validation/garage';
import { GarageForm } from '@/components/garages/garage-form';
import { GarageTransferPanel } from '@/components/garages/transfer-panel';
import { Field, inputCls } from '@/components/auth/field';
import type { Tables } from '@/types/database';

function PhotosSection({ garageId, photos }: { garageId: string; photos: Tables<'garage_photos'>[] }) {
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
      {add.isError && <p role="alert" className="text-sm text-danger">Upload failed. Try a smaller image.</p>}
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {photos.map((p) => (
          <li key={p.id} className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={garagePhotoUrl(p.storage_path)} alt={p.caption ?? ''} className="aspect-square w-full rounded-lg object-cover" />
            <button
              type="button"
              aria-label="Remove photo"
              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-navy/85 text-xs text-white hover:bg-danger"
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
  certifications: Tables<'garage_certifications'>[];
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
            <button type="button" className="ml-auto text-xs text-paper/50 underline hover:text-danger"
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
        {add.isError && <p role="alert" className="text-sm text-danger">Could not add the certification. Try again.</p>}
        <button type="submit" className="btn-ghost !px-4 !py-2 text-sm" disabled={add.isPending}>
          {add.isPending ? 'Adding…' : 'Add certification'}
        </button>
      </form>
    </section>
  );
}

export default function GarageProfilePage() {
  const { id } = useParams<{ id: string }>();
  const garage = useOwnedGarage(id);
  const update = useUpdateGarage(id);

  if (!garage.data) return null;

  return (
    <section className="py-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-2xl font-bold">Public profile</h2>
        {garage.data.status === 'active' && (
          <Link href={`/garages/${garage.data.slug}`} className="text-sm text-volt-bright hover:underline">
            View as customers see it →
          </Link>
        )}
      </div>
      <p className="mt-1 text-sm text-paper/60">
        Name, address, contacts, services, hours, gallery and certifications are yours to edit.
        Reviews and ratings are written by customers and can&rsquo;t be changed —{' '}
        <Link href={`/dashboard/garages/${id}/reviews`} className="text-volt-bright hover:underline">
          respond to them here
        </Link>
        .
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

      <GarageTransferPanel garageId={garage.data.id} />
    </section>
  );
}

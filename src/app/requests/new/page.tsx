'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useVehicles } from '@/lib/vehicles/queries';
import { useCreateRequest, useRepairCategories } from '@/lib/requests/queries';
import {
  serviceRequestSchema,
  attachmentProblems,
  URGENCIES,
  URGENCY_LABELS,
  MAX_ATTACHMENTS,
  type ServiceRequestData,
} from '@/lib/validation/request';
import { IRISH_COUNTIES } from '@/lib/validation/auth';
import { searchPlaces, type PlaceResult } from '@/lib/geo/osm';
import { formatEur } from '@/lib/vat';
import { track } from '@/lib/analytics';
import { Field, inputCls } from '@/components/auth/field';
import { cn } from '@/lib/utils';

const STEPS = ['Vehicle', 'Category', 'Details', 'Urgency', 'Location', 'Review'] as const;

type FormState = {
  vehicleId: string;
  serviceCategoryId: string;
  problemCategoryId: string;
  title: string;
  description: string;
  urgency: string;
  locationTown: string;
  locationCounty: string;
  lat: number | null;
  lng: number | null;
  collectionRequired: boolean;
  expectedCompletionDate: string;
  budgetAmount: string;
};

const EMPTY: FormState = {
  vehicleId: '', serviceCategoryId: '', problemCategoryId: '', title: '', description: '',
  urgency: 'flexible', locationTown: '', locationCounty: '', lat: null, lng: null,
  collectionRequired: false, expectedCompletionDate: '', budgetAmount: '',
};

export default function NewRequestPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [placeQuery, setPlaceQuery] = useState('');
  const [places, setPlaces] = useState<PlaceResult[] | null>(null);
  const [searching, setSearching] = useState(false);

  const vehicles = useVehicles();
  const categories = useRepairCategories();
  const create = useCreateRequest();

  const previews = useMemo(() => files.map((f) => ({ file: f, url: URL.createObjectURL(f) })), [files]);
  useEffect(() => () => previews.forEach((p) => URL.revokeObjectURL(p.url)), [previews]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function validateStep(fields: (keyof ServiceRequestData & keyof FormState)[]): boolean {
    const shape = Object.fromEntries(fields.map((f) => [f, true]));
    const parsed = serviceRequestSchema
      .pick(shape as never)
      .safeParse(Object.fromEntries(fields.map((f) => [f, form[f]])));
    if (parsed.success) {
      setErrors({});
      return true;
    }
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.');
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    setErrors(fieldErrors);
    return false;
  }

  const stepGuards: Array<() => boolean> = [
    () => validateStep(['vehicleId']),
    () => validateStep(['serviceCategoryId']),
    () => {
      const ok = validateStep(['title', 'description']);
      const fileProblem = attachmentProblems(files);
      if (fileProblem) {
        setErrors((e) => ({ ...e, files: fileProblem }));
        return false;
      }
      return ok;
    },
    () => validateStep(['urgency']),
    () => validateStep(['locationTown', 'locationCounty', 'expectedCompletionDate', 'budgetAmount']),
  ];

  function next() {
    if (stepGuards[step]?.()) setStep((s) => s + 1);
  }

  async function runPlaceSearch() {
    if (placeQuery.trim().length < 3) return;
    setSearching(true);
    try {
      setPlaces(await searchPlaces(placeQuery));
    } catch {
      setPlaces([]);
    } finally {
      setSearching(false);
    }
  }

  function pickPlace(p: PlaceResult) {
    setForm((f) => ({
      ...f,
      locationTown: p.town ?? f.locationTown,
      locationCounty:
        p.county && (IRISH_COUNTIES as readonly string[]).includes(p.county) ? p.county : f.locationCounty,
      lat: p.lat,
      lng: p.lng,
    }));
    setPlaces(null);
    setPlaceQuery(p.label);
  }

  function post() {
    const parsed = serviceRequestSchema.safeParse(form);
    if (!parsed.success) {
      setStep(0);
      setErrors({ form: 'Something is missing — walk through the steps again.' });
      return;
    }
    create.mutate(
      { data: parsed.data, files },
      {
        onSuccess: (r) => {
          track('request_created', { urgency: parsed.data!.urgency, attachments: files.length });
          const flag = r.failedAttachments.length ? '&attachments=failed' : '';
          router.push(`/dashboard/requests?posted=1${flag}`);
        },
      },
    );
  }

  const selectedVehicle = vehicles.data?.find((v) => v.id === form.vehicleId);
  const selectedCategory = categories.data?.parents.find((c) => c.id === form.serviceCategoryId);
  const problemOptions = form.serviceCategoryId
    ? categories.data?.childrenByParent.get(form.serviceCategoryId) ?? []
    : [];
  const selectedProblem = problemOptions.find((c) => c.id === form.problemCategoryId);

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-display text-3xl font-bold">Post a repair request</h1>

      <ol className="mt-6 flex flex-wrap gap-2 text-xs" aria-label="Progress">
        {STEPS.map((s, i) => (
          <li
            key={s}
            aria-current={i === step ? 'step' : undefined}
            className={cn(
              'rounded-full border px-3 py-1',
              i === step
                ? 'border-volt bg-volt/15 text-volt-bright'
                : i < step
                  ? 'border-ink-line text-paper/70'
                  : 'border-ink-line text-paper/40',
            )}
          >
            {i + 1}. {s}
          </li>
        ))}
      </ol>

      <div className="mt-8 space-y-5">
        {step === 0 && (
          <fieldset>
            <legend className="font-display text-xl font-semibold">Which vehicle is it?</legend>
            {vehicles.isPending && <p className="mt-4 text-paper/60">Loading your vehicles…</p>}
            {vehicles.data?.length === 0 && (
              <div className="mt-4 rounded-hex border border-ink-line bg-ink-soft p-6">
                <p className="text-paper/70">You haven&rsquo;t added a vehicle yet.</p>
                <Link href="/dashboard/vehicles/new" className="btn-primary mt-4 inline-flex !px-4 !py-2 text-sm">
                  Add a vehicle first
                </Link>
              </div>
            )}
            <div className="mt-4 space-y-3">
              {vehicles.data?.map((v) => (
                <label
                  key={v.id}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition',
                    form.vehicleId === v.id ? 'border-volt bg-volt/10' : 'border-ink-line bg-ink-soft hover:border-volt/50',
                  )}
                >
                  <input
                    type="radio"
                    name="vehicle"
                    className="h-4 w-4 accent-volt"
                    checked={form.vehicleId === v.id}
                    onChange={() => set('vehicleId', v.id)}
                  />
                  <span>
                    <span className="font-medium">
                      {[v.year, v.vehicle_makes?.name ?? v.make_text, v.vehicle_models?.name ?? v.model_text]
                        .filter(Boolean)
                        .join(' ')}
                    </span>
                    <span className="ml-2 font-mono text-sm text-volt-bright">{v.registration_number}</span>
                  </span>
                </label>
              ))}
            </div>
            {errors['vehicleId'] && <p role="alert" className="mt-2 text-sm text-danger">{errors['vehicleId']}</p>}
          </fieldset>
        )}

        {step === 1 && (
          <fieldset className="space-y-4">
            <legend className="font-display text-xl font-semibold">What kind of work is it?</legend>
            <Field label="Category" htmlFor="cat" error={errors['serviceCategoryId']}>
              <select
                id="cat"
                className={inputCls}
                value={form.serviceCategoryId}
                onChange={(e) => {
                  setForm((f) => ({ ...f, serviceCategoryId: e.target.value, problemCategoryId: '' }));
                }}
              >
                <option value="">Choose…</option>
                {categories.data?.parents.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>
            {problemOptions.length > 0 && (
              <Field label="Specific problem (optional)" htmlFor="problem" error={errors['problemCategoryId']}>
                <select
                  id="problem"
                  className={inputCls}
                  value={form.problemCategoryId}
                  onChange={(e) => set('problemCategoryId', e.target.value)}
                >
                  <option value="">Not sure / other</option>
                  {problemOptions.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </Field>
            )}
          </fieldset>
        )}

        {step === 2 && (
          <fieldset className="space-y-4">
            <legend className="font-display text-xl font-semibold">Describe the problem</legend>
            <Field label="Title" htmlFor="title" error={errors['title']}>
              <input
                id="title"
                className={inputCls}
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder="e.g. Grinding noise when braking"
                maxLength={120}
              />
            </Field>
            <Field label="Description" htmlFor="description" error={errors['description']}>
              <textarea
                id="description"
                rows={5}
                className={inputCls}
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="When did it start? Any warning lights? What have you tried?"
                maxLength={2000}
              />
            </Field>
            <Field label={`Photos or videos (optional, up to ${MAX_ATTACHMENTS})`} htmlFor="media" error={errors['files']}>
              <input
                id="media"
                type="file"
                accept="image/*,video/*"
                multiple
                className="block w-full text-sm text-paper/70 file:mr-4 file:rounded-lg file:border-0 file:bg-volt file:px-4 file:py-2 file:font-display file:font-semibold file:text-white hover:file:bg-volt-bright"
                onChange={(e) => {
                  const chosen = Array.from(e.target.files ?? []);
                  setFiles((prev) => [...prev, ...chosen].slice(0, MAX_ATTACHMENTS));
                  e.target.value = '';
                }}
              />
            </Field>
            {previews.length > 0 && (
              <ul className="flex flex-wrap gap-3">
                {previews.map((p, i) => (
                  <li key={p.url} className="relative">
                    {p.file.type.startsWith('video/') ? (
                      <video src={p.url} className="h-20 w-20 rounded-lg object-cover" muted />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.url} alt={p.file.name} className="h-20 w-20 rounded-lg object-cover" />
                    )}
                    <button
                      type="button"
                      aria-label={`Remove ${p.file.name}`}
                      className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-navy text-xs text-white hover:bg-danger"
                      onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                    >
                      &#10005;
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </fieldset>
        )}

        {step === 3 && (
          <fieldset className="space-y-3">
            <legend className="font-display text-xl font-semibold">How urgent is it?</legend>
            {URGENCIES.map((u) => (
              <label
                key={u}
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition',
                  form.urgency === u ? 'border-volt bg-volt/10' : 'border-ink-line bg-ink-soft hover:border-volt/50',
                )}
              >
                <input
                  type="radio"
                  name="urgency"
                  className="h-4 w-4 accent-volt"
                  checked={form.urgency === u}
                  onChange={() => set('urgency', u)}
                />
                {URGENCY_LABELS[u]}
              </label>
            ))}
          </fieldset>
        )}

        {step === 4 && (
          <fieldset className="space-y-4">
            <legend className="font-display text-xl font-semibold">Where is the vehicle?</legend>
            <Field label="Search for your area (OpenStreetMap)" htmlFor="place">
              <div className="flex gap-2">
                <input
                  id="place"
                  className={inputCls}
                  value={placeQuery}
                  onChange={(e) => setPlaceQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); runPlaceSearch(); } }}
                  placeholder="e.g. Naas, Kildare"
                />
                <button type="button" className="btn-ghost shrink-0 !px-4" onClick={runPlaceSearch} disabled={searching}>
                  {searching ? '…' : 'Search'}
                </button>
              </div>
            </Field>
            {places && (
              <ul className="divide-y divide-ink-line rounded-lg border border-ink-line bg-ink-soft">
                {places.length === 0 && <li className="p-3 text-sm text-paper/50">No matches — fill the fields below.</li>}
                {places.map((p) => (
                  <li key={`${p.lat},${p.lng}`}>
                    <button
                      type="button"
                      className="w-full p-3 text-left text-sm hover:bg-volt/10"
                      onClick={() => pickPlace(p)}
                    >
                      {p.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Town or city" htmlFor="locationTown" error={errors['locationTown']}>
                <input id="locationTown" className={inputCls} value={form.locationTown}
                  onChange={(e) => set('locationTown', e.target.value)} />
              </Field>
              <Field label="County" htmlFor="locationCounty" error={errors['locationCounty']}>
                <select id="locationCounty" className={inputCls} value={form.locationCounty}
                  onChange={(e) => set('locationCounty', e.target.value)}>
                  <option value="">Choose…</option>
                  {IRISH_COUNTIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
            </div>
            <label className="flex items-center gap-3 text-sm text-paper/80">
              <input type="checkbox" className="h-4 w-4 accent-volt" checked={form.collectionRequired}
                onChange={(e) => set('collectionRequired', e.target.checked)} />
              I need the garage to collect the vehicle
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Needed by (optional)" htmlFor="date" error={errors['expectedCompletionDate']}>
                <input id="date" type="date" className={inputCls} value={form.expectedCompletionDate}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => set('expectedCompletionDate', e.target.value)} />
              </Field>
              <Field label="Budget in € (optional)" htmlFor="budget" error={errors['budgetAmount']}>
                <input id="budget" inputMode="decimal" className={inputCls} value={form.budgetAmount}
                  onChange={(e) => set('budgetAmount', e.target.value)} placeholder="500" />
              </Field>
            </div>
          </fieldset>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <h2 className="font-display text-xl font-semibold">Review and post</h2>
            <dl className="divide-y divide-ink-line rounded-hex border border-ink-line bg-ink-soft px-6">
              {[
                ['Vehicle', selectedVehicle
                  ? `${[selectedVehicle.year, selectedVehicle.vehicle_makes?.name ?? selectedVehicle.make_text, selectedVehicle.vehicle_models?.name ?? selectedVehicle.model_text].filter(Boolean).join(' ')} (${selectedVehicle.registration_number})`
                  : '—'],
                ['Category', [selectedCategory?.name, selectedProblem?.name].filter(Boolean).join(' — ') || '—'],
                ['Title', form.title],
                ['Description', form.description],
                ['Attachments', files.length ? `${files.length} file${files.length > 1 ? 's' : ''}` : 'None'],
                ['Urgency', URGENCY_LABELS[form.urgency as (typeof URGENCIES)[number]]],
                ['Location', `${form.locationTown}, Co. ${form.locationCounty}`],
                ['Collection', form.collectionRequired ? 'Yes' : 'No'],
                ['Needed by', form.expectedCompletionDate || 'Flexible'],
                ['Budget', form.budgetAmount ? formatEur(Number(form.budgetAmount)) : 'Not set'],
              ].map(([k, v]) => (
                <div key={k as string} className="grid grid-cols-3 gap-4 py-3 text-sm">
                  <dt className="text-paper/50">{k}</dt>
                  <dd className="col-span-2 whitespace-pre-wrap">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="text-sm text-paper/50">
              Your request stays open for 14 days. Verified garages nearby will be able to see it and send quotes.
            </p>
            {create.isError && (
              <p role="alert" className="text-sm text-danger">Could not post your request. Try again.</p>
            )}
            {errors['form'] && <p role="alert" className="text-sm text-danger">{errors['form']}</p>}
          </div>
        )}
      </div>

      <div className="mt-8 flex justify-between">
        <button
          type="button"
          className={cn('btn-ghost', step === 0 && 'invisible')}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
        >
          Back
        </button>
        {step < STEPS.length - 1 ? (
          <button type="button" className="btn-primary" onClick={next}>
            Continue
          </button>
        ) : (
          <button type="button" className="btn-primary" onClick={post} disabled={create.isPending}>
            {create.isPending ? 'Posting…' : 'Post request'}
          </button>
        )}
      </div>
    </main>
  );
}

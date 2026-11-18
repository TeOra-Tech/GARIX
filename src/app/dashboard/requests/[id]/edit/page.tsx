'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useVehicles } from '@/lib/vehicles/queries';
import { useMyRequest } from '@/lib/quotes/queries';
import {
  EDITABLE_REQUEST_STATUSES,
  requestActionError,
  useRepairCategories,
  useUpdateRequest,
} from '@/lib/requests/queries';
import { serviceRequestSchema, URGENCIES, URGENCY_LABELS } from '@/lib/validation/request';
import { IRISH_COUNTIES } from '@/lib/validation/auth';
import { searchPlaces, type PlaceResult } from '@/lib/geo/osm';
import { Field, inputCls } from '@/components/auth/field';

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

export default function EditRequestPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const request = useMyRequest(id);
  const vehicles = useVehicles();
  const categories = useRepairCategories();
  const update = useUpdateRequest(id);
  const [form, setForm] = useState<FormState | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [placeQuery, setPlaceQuery] = useState('');
  const [places, setPlaces] = useState<PlaceResult[] | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const r = request.data;
    if (!r || form) return;
    setForm({
      vehicleId: r.vehicle_id,
      serviceCategoryId: r.service_category_id ?? '',
      problemCategoryId: r.problem_category_id ?? '',
      title: r.title,
      description: r.description,
      urgency: r.urgency,
      locationTown: r.location_town ?? '',
      locationCounty: r.location_county ?? '',
      lat: null,
      lng: null,
      collectionRequired: r.collection_required,
      expectedCompletionDate: r.expected_completion_date ?? '',
      budgetAmount: r.budget_amount != null ? String(r.budget_amount) : '',
    });
  }, [request.data, form]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => (f ? { ...f, [key]: value } : f));
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
    setForm((f) =>
      f
        ? {
            ...f,
            locationTown: p.town ?? f.locationTown,
            locationCounty:
              p.county && (IRISH_COUNTIES as readonly string[]).includes(p.county) ? p.county : f.locationCounty,
            lat: p.lat,
            lng: p.lng,
          }
        : f,
    );
    setPlaces(null);
    setPlaceQuery(p.label);
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    const parsed = serviceRequestSchema.safeParse(form);
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
    update.mutate(parsed.data, { onSuccess: () => router.push(`/dashboard/requests/${id}?updated=1`) });
  }

  const editable =
    request.data && (EDITABLE_REQUEST_STATUSES as readonly string[]).includes(request.data.status);
  const problemOptions = form?.serviceCategoryId
    ? categories.data?.childrenByParent.get(form.serviceCategoryId) ?? []
    : [];

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <Link href={`/dashboard/requests/${id}`} className="text-sm text-paper/70 hover:text-volt-bright">
        &larr; Back to request
      </Link>
      <h1 className="mt-2 font-display text-3xl font-bold">Edit request</h1>

      {request.isPending && <p className="mt-8 text-paper/70">Loading your request…</p>}
      {request.isError && <p role="alert" className="mt-8 text-danger">Could not load this request.</p>}

      {request.data && !editable && (
        <p className="mt-8 rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm">
          A garage has already quoted on this request, so it can no longer be edited. If the details have changed,
          delete it from the request page and post a new one.
        </p>
      )}

      {form && editable && (
        <form onSubmit={save} className="mt-8 space-y-5" noValidate>
          <Field label="Vehicle" htmlFor="vehicle" error={errors['vehicleId']}>
            <select id="vehicle" className={inputCls} value={form.vehicleId} onChange={(e) => set('vehicleId', e.target.value)}>
              {vehicles.data?.map((v) => (
                <option key={v.id} value={v.id}>
                  {[v.registration_number, v.vehicle_makes?.name ?? v.make_text, v.vehicle_models?.name ?? v.model_text]
                    .filter(Boolean)
                    .join(' · ')}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category" htmlFor="cat" error={errors['serviceCategoryId']}>
              <select
                id="cat"
                className={inputCls}
                value={form.serviceCategoryId}
                onChange={(e) => setForm((f) => (f ? { ...f, serviceCategoryId: e.target.value, problemCategoryId: '' } : f))}
              >
                <option value="">Choose…</option>
                {categories.data?.parents.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>
            {problemOptions.length > 0 && (
              <Field label="Specific problem (optional)" htmlFor="problem">
                <select id="problem" className={inputCls} value={form.problemCategoryId} onChange={(e) => set('problemCategoryId', e.target.value)}>
                  <option value="">Not sure / other</option>
                  {problemOptions.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </Field>
            )}
          </div>

          <Field label="Title" htmlFor="title" error={errors['title']}>
            <input id="title" className={inputCls} value={form.title} maxLength={120} onChange={(e) => set('title', e.target.value)} />
          </Field>
          <Field label="Description" htmlFor="description" error={errors['description']}>
            <textarea id="description" rows={5} className={inputCls} value={form.description} maxLength={2000}
              onChange={(e) => set('description', e.target.value)} />
          </Field>

          <Field label="How urgent is it?" htmlFor="urgency">
            <select id="urgency" className={inputCls} value={form.urgency} onChange={(e) => set('urgency', e.target.value)}>
              {URGENCIES.map((u) => (
                <option key={u} value={u}>{URGENCY_LABELS[u]}</option>
              ))}
            </select>
          </Field>

          <Field label="Change area (OpenStreetMap search)" htmlFor="place">
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
              {places.length === 0 && <li className="p-3 text-sm text-paper/70">No matches — edit the fields below.</li>}
              {places.map((p) => (
                <li key={`${p.lat},${p.lng}`}>
                  <button type="button" className="w-full p-3 text-left text-sm hover:bg-volt/10" onClick={() => pickPlace(p)}>
                    {p.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Town or city" htmlFor="locationTown" error={errors['locationTown']}>
              <input id="locationTown" className={inputCls} value={form.locationTown} onChange={(e) => set('locationTown', e.target.value)} />
            </Field>
            <Field label="County" htmlFor="locationCounty" error={errors['locationCounty']}>
              <select id="locationCounty" className={inputCls} value={form.locationCounty} onChange={(e) => set('locationCounty', e.target.value)}>
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
                onChange={(e) => set('expectedCompletionDate', e.target.value)} />
            </Field>
            <Field label="Budget in € (optional)" htmlFor="budget" error={errors['budgetAmount']}>
              <input id="budget" type="number" inputMode="decimal" min="0" step="1" className={inputCls} value={form.budgetAmount}
                onChange={(e) => set('budgetAmount', e.target.value)} />
            </Field>
          </div>

          {update.isError && <p role="alert" className="text-sm text-danger">{requestActionError(update.error)}</p>}
          <div className="flex flex-wrap gap-3">
            <button type="submit" className="btn-primary" disabled={update.isPending}>
              {update.isPending ? 'Saving…' : 'Save changes'}
            </button>
            <Link href={`/dashboard/requests/${id}`} className="btn-ghost">Cancel</Link>
          </div>
        </form>
      )}
    </main>
  );
}

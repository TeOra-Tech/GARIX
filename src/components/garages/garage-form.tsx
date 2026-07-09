'use client';

import { useState } from 'react';
import { useRepairCategories } from '@/lib/requests/queries';
import { garageSchema, registerGarageSchema, WEEK_DAYS, DAY_LABELS, type GarageData, type WeekDay } from '@/lib/validation/garage';
import { IRISH_COUNTIES } from '@/lib/validation/auth';
import { searchPlaces, type PlaceResult } from '@/lib/geo/osm';
import type { GarageWithRelations } from '@/lib/garages/queries';
import { Field, inputCls } from '@/components/auth/field';
import { cn } from '@/lib/utils';

type HoursState = Record<WeekDay, { enabled: boolean; open: string; close: string }>;

const DEFAULT_HOURS: HoursState = {
  mon: { enabled: true, open: '09:00', close: '18:00' },
  tue: { enabled: true, open: '09:00', close: '18:00' },
  wed: { enabled: true, open: '09:00', close: '18:00' },
  thu: { enabled: true, open: '09:00', close: '18:00' },
  fri: { enabled: true, open: '09:00', close: '18:00' },
  sat: { enabled: false, open: '09:00', close: '13:00' },
  sun: { enabled: false, open: '10:00', close: '13:00' },
};

function hoursFromGarage(g?: GarageWithRelations): HoursState {
  if (!g) return DEFAULT_HOURS;
  const stored = (g.opening_hours ?? {}) as Record<string, { open: string; close: string }>;
  const state = { ...DEFAULT_HOURS };
  for (const day of WEEK_DAYS) {
    state[day] = stored[day]
      ? { enabled: true, open: stored[day].open, close: stored[day].close }
      : { ...state[day], enabled: false };
  }
  return state;
}

type FormState = {
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  website: string;
  description: string;
  yearsInBusiness: string;
  serviceRadiusKm: string;
  isEvSpecialist: boolean;
  offersCollection: boolean;
  line1: string;
  line2: string;
  town: string;
  county: string;
  eircode: string;
  lat: number | null;
  lng: number | null;
  serviceCategoryIds: string[];
};

function fromGarage(g?: GarageWithRelations): FormState {
  const loc = g?.garage_locations.find((l) => l.is_primary) ?? g?.garage_locations[0];
  return {
    name: g?.name ?? '',
    contactPerson: g?.contact_person ?? '',
    phone: g?.phone ?? '',
    email: g?.email ?? '',
    website: g?.website ?? '',
    description: g?.description ?? '',
    yearsInBusiness: g?.years_in_business?.toString() ?? '',
    serviceRadiusKm: g?.service_radius_km?.toString() ?? '20',
    isEvSpecialist: g?.is_ev_specialist ?? false,
    offersCollection: g?.offers_collection ?? false,
    line1: loc?.line1 ?? '',
    line2: loc?.line2 ?? '',
    town: loc?.town ?? '',
    county: loc?.county ?? '',
    eircode: loc?.eircode ?? '',
    // existing garages keep their stored point unless the owner re-searches
    lat: null,
    lng: null,
    serviceCategoryIds: g?.garage_services.map((s) => s.repair_category_id) ?? [],
  };
}

export function GarageForm({
  initial,
  requirePoint = false,
  submitLabel,
  pending,
  serverError,
  onSubmit,
}: {
  initial?: GarageWithRelations;
  /** Registration must pin the premises; edits may keep the stored point. */
  requirePoint?: boolean;
  submitLabel: string;
  pending: boolean;
  serverError: string | null;
  onSubmit: (data: GarageData) => void;
}) {
  const [form, setForm] = useState<FormState>(() => fromGarage(initial));
  const [hours, setHours] = useState<HoursState>(() => hoursFromGarage(initial));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [placeQuery, setPlaceQuery] = useState('');
  const [places, setPlaces] = useState<PlaceResult[] | null>(null);
  const [searching, setSearching] = useState(false);

  const categories = useRepairCategories();

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function runPlaceSearch() {
    const q = placeQuery.trim() || [form.line1, form.town, form.county].filter(Boolean).join(', ');
    if (q.length < 3) return;
    setSearching(true);
    try {
      setPlaces(await searchPlaces(q));
    } catch {
      setPlaces([]);
    } finally {
      setSearching(false);
    }
  }

  function pickPlace(p: PlaceResult) {
    setForm((f) => ({
      ...f,
      town: p.town ?? f.town,
      county: p.county && (IRISH_COUNTIES as readonly string[]).includes(p.county) ? p.county : f.county,
      lat: p.lat,
      lng: p.lng,
    }));
    setPlaces(null);
    setPlaceQuery(p.label);
  }

  function toggleService(id: string) {
    setForm((f) => ({
      ...f,
      serviceCategoryIds: f.serviceCategoryIds.includes(id)
        ? f.serviceCategoryIds.filter((s) => s !== id)
        : [...f.serviceCategoryIds, id],
    }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const openingHours = Object.fromEntries(
      WEEK_DAYS.filter((d) => hours[d].enabled).map((d) => [d, { open: hours[d].open, close: hours[d].close }]),
    );
    const parsed = (requirePoint ? registerGarageSchema : garageSchema).safeParse({
      name: form.name,
      contactPerson: form.contactPerson,
      phone: form.phone,
      email: form.email,
      website: form.website,
      description: form.description,
      yearsInBusiness: form.yearsInBusiness,
      serviceRadiusKm: form.serviceRadiusKm,
      isEvSpecialist: form.isEvSpecialist,
      offersCollection: form.offersCollection,
      openingHours,
      address: {
        line1: form.line1,
        line2: form.line2,
        town: form.town,
        county: form.county,
        eircode: form.eircode,
      },
      lat: form.lat,
      lng: form.lng,
      serviceCategoryIds: form.serviceCategoryIds,
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
    onSubmit(parsed.data);
  }

  return (
    <form onSubmit={submit} className="space-y-8" noValidate>
      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold">Business details</h2>
        <Field label="Garage name" htmlFor="name" error={errors['name']}>
          <input id="name" required className={inputCls} value={form.name}
            onChange={(e) => set('name', e.target.value)} placeholder="e.g. Naas Road Motors" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Contact person" htmlFor="contactPerson" error={errors['contactPerson']}>
            <input id="contactPerson" required className={inputCls} value={form.contactPerson}
              onChange={(e) => set('contactPerson', e.target.value)} />
          </Field>
          <Field label="Phone" htmlFor="phone" error={errors['phone']}>
            <input id="phone" type="tel" required className={inputCls} value={form.phone}
              onChange={(e) => set('phone', e.target.value)} placeholder="045 123 456" />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Business email (optional)" htmlFor="gemail" error={errors['email']}>
            <input id="gemail" type="email" className={inputCls} value={form.email}
              onChange={(e) => set('email', e.target.value)} />
          </Field>
          <Field label="Website (optional)" htmlFor="website" error={errors['website']}>
            <input id="website" type="url" className={inputCls} value={form.website}
              onChange={(e) => set('website', e.target.value)} placeholder="https://" />
          </Field>
        </div>
        <Field label="Description (optional)" htmlFor="description" error={errors['description']}>
          <textarea id="description" rows={4} className={inputCls} value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="What you specialise in, brands you know best, anything customers should know." maxLength={2000} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Years in business (optional)" htmlFor="years" error={errors['yearsInBusiness']}>
            <input id="years" inputMode="numeric" className={inputCls} value={form.yearsInBusiness}
              onChange={(e) => set('yearsInBusiness', e.target.value)} />
          </Field>
          <Field label="Service radius (km)" htmlFor="radius" error={errors['serviceRadiusKm']}>
            <input id="radius" inputMode="numeric" required className={inputCls} value={form.serviceRadiusKm}
              onChange={(e) => set('serviceRadiusKm', e.target.value)} />
          </Field>
        </div>
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm text-paper/80">
            <input type="checkbox" className="h-4 w-4 accent-volt" checked={form.isEvSpecialist}
              onChange={(e) => set('isEvSpecialist', e.target.checked)} />
            EV specialist
          </label>
          <label className="flex items-center gap-2 text-sm text-paper/80">
            <input type="checkbox" className="h-4 w-4 accent-volt" checked={form.offersCollection}
              onChange={(e) => set('offersCollection', e.target.checked)} />
            We collect vehicles
          </label>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold">Premises</h2>
        <Field label="Address line 1" htmlFor="line1" error={errors['address.line1']}>
          <input id="line1" required className={inputCls} value={form.line1}
            onChange={(e) => set('line1', e.target.value)} />
        </Field>
        <Field label="Address line 2 (optional)" htmlFor="line2" error={errors['address.line2']}>
          <input id="line2" className={inputCls} value={form.line2}
            onChange={(e) => set('line2', e.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Town or city" htmlFor="gtown" error={errors['address.town']}>
            <input id="gtown" required className={inputCls} value={form.town}
              onChange={(e) => set('town', e.target.value)} />
          </Field>
          <Field label="County" htmlFor="gcounty" error={errors['address.county']}>
            <select id="gcounty" required className={inputCls} value={form.county}
              onChange={(e) => set('county', e.target.value)}>
              <option value="">Choose…</option>
              {IRISH_COUNTIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Eircode (optional)" htmlFor="geircode" error={errors['address.eircode']}>
            <input id="geircode" className={inputCls} value={form.eircode}
              onChange={(e) => set('eircode', e.target.value)} placeholder="W91 X2F3" />
          </Field>
        </div>
        <Field label="Pin your premises (search OpenStreetMap)" htmlFor="gplace" error={errors['lat']}>
          <div className="flex gap-2">
            <input id="gplace" className={inputCls} value={placeQuery}
              onChange={(e) => setPlaceQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); runPlaceSearch(); } }}
              placeholder="Leave empty to search using the address above" />
            <button type="button" className="btn-ghost shrink-0 !px-4" onClick={runPlaceSearch} disabled={searching}>
              {searching ? '…' : 'Search'}
            </button>
          </div>
        </Field>
        {form.lat != null ? (
          <p className="text-sm text-paper/50">
            Pinned at {form.lat.toFixed(4)}, {form.lng?.toFixed(4)}
          </p>
        ) : (
          initial && <p className="text-sm text-paper/50">Keeping your current pin — search to move it.</p>
        )}
        {places && (
          <ul className="divide-y divide-ink-line rounded-lg border border-ink-line bg-ink-soft">
            {places.length === 0 && <li className="p-3 text-sm text-paper/50">No matches — try a simpler search.</li>}
            {places.map((p) => (
              <li key={`${p.lat},${p.lng}`}>
                <button type="button" className="w-full p-3 text-left text-sm hover:bg-volt/10" onClick={() => pickPlace(p)}>
                  {p.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold">Services you offer</h2>
        {errors['serviceCategoryIds'] && (
          <p role="alert" className="text-sm text-danger">{errors['serviceCategoryIds']}</p>
        )}
        <div className="grid gap-2 sm:grid-cols-2">
          {categories.data?.parents.map((c) => (
            <label
              key={c.id}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition',
                form.serviceCategoryIds.includes(c.id)
                  ? 'border-volt bg-volt/10'
                  : 'border-ink-line bg-ink-soft hover:border-volt/50',
              )}
            >
              <input type="checkbox" className="h-4 w-4 accent-volt"
                checked={form.serviceCategoryIds.includes(c.id)} onChange={() => toggleService(c.id)} />
              {c.name}
            </label>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold">Opening hours</h2>
        {WEEK_DAYS.map((d) => (
          <div key={d} className="flex flex-wrap items-center gap-3">
            <label className="flex w-36 items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4 accent-volt" checked={hours[d].enabled}
                onChange={(e) => setHours((h) => ({ ...h, [d]: { ...h[d], enabled: e.target.checked } }))} />
              {DAY_LABELS[d]}
            </label>
            {hours[d].enabled ? (
              <>
                <input type="time" aria-label={`${DAY_LABELS[d]} opening time`}
                  className={cn(inputCls, 'w-32')} value={hours[d].open}
                  onChange={(e) => setHours((h) => ({ ...h, [d]: { ...h[d], open: e.target.value } }))} />
                <span className="text-paper/40">to</span>
                <input type="time" aria-label={`${DAY_LABELS[d]} closing time`}
                  className={cn(inputCls, 'w-32')} value={hours[d].close}
                  onChange={(e) => setHours((h) => ({ ...h, [d]: { ...h[d], close: e.target.value } }))} />
              </>
            ) : (
              <span className="text-sm text-paper/40">Closed</span>
            )}
            {errors[`openingHours.${d}`] && (
              <span role="alert" className="text-sm text-danger">{errors[`openingHours.${d}`]}</span>
            )}
          </div>
        ))}
      </section>

      {serverError && <p role="alert" className="text-sm text-danger">{serverError}</p>}

      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? 'Saving…' : submitLabel}
      </button>
    </form>
  );
}

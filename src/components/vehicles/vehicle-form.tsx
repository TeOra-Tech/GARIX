'use client';

import { useState } from 'react';
import { lookupByReg } from '@/lib/vehicles/lookup';
import { useEngines, useMakes, useModels, type VehicleRow } from '@/lib/vehicles/queries';
import { vehicleSchema, FUEL_TYPES, TRANSMISSIONS, type VehicleData } from '@/lib/validation/vehicle';
import { Field, inputCls } from '@/components/auth/field';

const FUEL_LABELS: Record<(typeof FUEL_TYPES)[number], string> = {
  petrol: 'Petrol', diesel: 'Diesel', hybrid: 'Hybrid', plugin_hybrid: 'Plug-in hybrid',
  electric: 'Electric', lpg: 'LPG', other: 'Other',
};
const TRANSMISSION_LABELS: Record<(typeof TRANSMISSIONS)[number], string> = {
  manual: 'Manual', automatic: 'Automatic', semi_automatic: 'Semi-automatic', cvt: 'CVT',
};

type FormState = {
  registrationNumber: string;
  makeId: string;
  makeText: string;
  modelId: string;
  modelText: string;
  variant: string;
  year: string;
  engineId: string;
  engineSizeCustom: string;
  fuelType: string;
  transmission: string;
  vin: string;
  mileageKm: string;
};

function fromRow(v?: VehicleRow): FormState {
  return {
    registrationNumber: v?.registration_number ?? '',
    makeId: v?.make_id ?? '',
    makeText: v?.make_text ?? '',
    modelId: v?.model_id ?? '',
    modelText: v?.model_text ?? '',
    variant: v?.variant ?? '',
    year: v?.year?.toString() ?? '',
    engineId: v?.engine_id ?? '',
    engineSizeCustom: v?.engine_size_custom ?? '',
    fuelType: v?.fuel_type ?? '',
    transmission: v?.transmission ?? '',
    vin: v?.vin ?? '',
    mileageKm: v?.mileage_km?.toString() ?? '',
  };
}

export function VehicleForm({
  initial,
  submitLabel,
  pending,
  serverError,
  onSubmit,
}: {
  initial?: VehicleRow;
  submitLabel: string;
  pending: boolean;
  serverError: string | null;
  onSubmit: (data: VehicleData) => void;
}) {
  const [form, setForm] = useState<FormState>(() => fromRow(initial));
  const [manualMake, setManualMake] = useState(!!initial?.make_text && !initial?.make_id);
  const [detailsOpen, setDetailsOpen] = useState(!!initial);
  const [looking, setLooking] = useState(false);
  const [lookupNote, setLookupNote] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const makes = useMakes();
  const models = useModels(form.makeId || null);
  const engines = useEngines();

  const selectedEngine = engines.data?.find((e) => e.id === form.engineId);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function runLookup() {
    if (!form.registrationNumber.trim()) {
      setErrors({ registrationNumber: 'Enter the registration number first' });
      return;
    }
    setErrors({});
    setLooking(true);
    const result = await lookupByReg(form.registrationNumber);
    setLooking(false);
    setDetailsOpen(true);
    if (!result.data) {
      setLookupNote('No automatic match for that reg — enter the details below.');
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = vehicleSchema.safeParse({
      registrationNumber: form.registrationNumber,
      makeId: manualMake ? '' : form.makeId,
      makeText: manualMake ? form.makeText : '',
      modelId: manualMake ? '' : form.modelId,
      modelText: manualMake ? form.modelText : '',
      variant: form.variant,
      year: form.year,
      engineId: form.engineId,
      engineSizeCustom: selectedEngine?.is_custom ? form.engineSizeCustom : '',
      fuelType: form.fuelType,
      transmission: form.transmission,
      vin: form.vin,
      mileageKm: form.mileageKm,
    });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join('.');
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      setDetailsOpen(true);
      return;
    }
    setErrors({});
    onSubmit(parsed.data);
  }

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <Field label="Registration number" htmlFor="reg" error={errors['registrationNumber']}>
            <input
              id="reg"
              required
              className={inputCls}
              value={form.registrationNumber}
              onChange={(e) => set('registrationNumber', e.target.value)}
              placeholder="191-D-12345"
            />
          </Field>
        </div>
        <button type="button" className="btn-ghost shrink-0" onClick={runLookup} disabled={looking}>
          {looking ? 'Checking…' : 'Look up'}
        </button>
      </div>
      {lookupNote && <p className="text-sm text-paper/60">{lookupNote}</p>}

      {!detailsOpen && (
        <button type="button" className="text-sm text-volt-bright underline" onClick={() => setDetailsOpen(true)}>
          Enter details manually
        </button>
      )}

      {detailsOpen && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {manualMake ? (
              <>
                <Field label="Make" htmlFor="makeText" error={errors['makeText']}>
                  <input id="makeText" className={inputCls} value={form.makeText}
                    onChange={(e) => set('makeText', e.target.value)} placeholder="e.g. Lada" />
                </Field>
                <Field label="Model" htmlFor="modelText" error={errors['modelText']}>
                  <input id="modelText" className={inputCls} value={form.modelText}
                    onChange={(e) => set('modelText', e.target.value)} placeholder="e.g. Niva" />
                </Field>
              </>
            ) : (
              <>
                <Field label="Make" htmlFor="makeId" error={errors['makeId']}>
                  <select id="makeId" className={inputCls} value={form.makeId}
                    onChange={(e) => { set('makeId', e.target.value); set('modelId', ''); }}>
                    <option value="">Choose…</option>
                    {makes.data?.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </Field>
                <Field label="Model" htmlFor="modelId" error={errors['modelId']}>
                  <select id="modelId" className={inputCls} value={form.modelId}
                    onChange={(e) => set('modelId', e.target.value)} disabled={!form.makeId}>
                    <option value="">{form.makeId ? 'Choose…' : 'Choose a make first'}</option>
                    {models.data?.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </Field>
              </>
            )}
          </div>
          <label className="flex items-center gap-2 text-sm text-paper/60">
            <input type="checkbox" className="h-4 w-4 accent-volt" checked={manualMake}
              onChange={(e) => setManualMake(e.target.checked)} />
            My make isn&rsquo;t listed
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Variant (optional)" htmlFor="variant" error={errors['variant']}>
              <input id="variant" className={inputCls} value={form.variant}
                onChange={(e) => set('variant', e.target.value)} placeholder="e.g. Comfortline" />
            </Field>
            <Field label="Year (optional)" htmlFor="year" error={errors['year']}>
              <input id="year" inputMode="numeric" className={inputCls} value={form.year}
                onChange={(e) => set('year', e.target.value)} placeholder="2019" />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Engine size (optional)" htmlFor="engineId" error={errors['engineId']}>
              <select id="engineId" className={inputCls} value={form.engineId}
                onChange={(e) => set('engineId', e.target.value)}>
                <option value="">Choose…</option>
                {engines.data?.map((en) => <option key={en.id} value={en.id}>{en.label}</option>)}
              </select>
            </Field>
            {selectedEngine?.is_custom && (
              <Field label="Custom engine size" htmlFor="engineSizeCustom" error={errors['engineSizeCustom']}>
                <input id="engineSizeCustom" className={inputCls} value={form.engineSizeCustom}
                  onChange={(e) => set('engineSizeCustom', e.target.value)} placeholder="e.g. 6.2L V8" />
              </Field>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Fuel type (optional)" htmlFor="fuelType" error={errors['fuelType']}>
              <select id="fuelType" className={inputCls} value={form.fuelType}
                onChange={(e) => set('fuelType', e.target.value)}>
                <option value="">Choose…</option>
                {FUEL_TYPES.map((f) => <option key={f} value={f}>{FUEL_LABELS[f]}</option>)}
              </select>
            </Field>
            <Field label="Transmission (optional)" htmlFor="transmission" error={errors['transmission']}>
              <select id="transmission" className={inputCls} value={form.transmission}
                onChange={(e) => set('transmission', e.target.value)}>
                <option value="">Choose…</option>
                {TRANSMISSIONS.map((t) => <option key={t} value={t}>{TRANSMISSION_LABELS[t]}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Mileage in km (optional)" htmlFor="mileageKm" error={errors['mileageKm']}>
              <input id="mileageKm" inputMode="numeric" className={inputCls} value={form.mileageKm}
                onChange={(e) => set('mileageKm', e.target.value)} placeholder="120000" />
            </Field>
            <Field label="VIN (optional)" htmlFor="vin" error={errors['vin']}>
              <input id="vin" className={inputCls} value={form.vin}
                onChange={(e) => set('vin', e.target.value)} maxLength={17} />
            </Field>
          </div>
        </>
      )}

      {serverError && <p role="alert" className="text-sm text-danger">{serverError}</p>}

      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? 'Saving…' : submitLabel}
      </button>
    </form>
  );
}

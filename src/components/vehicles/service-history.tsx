'use client';

import { useState } from 'react';
import { formatEur } from '@/lib/vat';
import {
  useAddServiceRecord,
  useDeleteServiceRecord,
  useServiceRecords,
  type ServiceRecordRow,
} from '@/lib/vehicles/care';
import {
  SERVICE_RECORD_TYPES,
  recordTypeLabel,
  serviceRecordSchema,
} from '@/lib/validation/vehicle-care';
import { Field, inputCls } from '@/components/auth/field';

const EMPTY = {
  eventType: 'service',
  eventDate: '',
  title: '',
  description: '',
  partsReplaced: '',
  mileageKm: '',
  costEur: '',
  garageName: '',
  warrantyUntil: '',
  nextDueDate: '',
  nextDueMileageKm: '',
};

function formatDate(d: string): string {
  return new Date(`${d}T00:00:00`).toLocaleDateString('en-IE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function RecordCard({ record, vehicleId }: { record: ServiceRecordRow; vehicleId: string }) {
  const del = useDeleteServiceRecord(vehicleId);
  const [confirming, setConfirming] = useState(false);
  const isTransfer = record.event_type === 'ownership_change';

  const facts = [
    record.mileage_km != null ? `${record.mileage_km.toLocaleString('en-IE')} km` : null,
    record.cost_eur != null ? formatEur(Number(record.cost_eur)) : null,
    record.garage_name,
  ].filter(Boolean);

  return (
    <li className="rounded-hex border border-ink-line bg-ink-soft p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <span className="rounded-full border border-volt/40 bg-volt/10 px-2.5 py-0.5 text-xs font-semibold text-volt-bright">
            {recordTypeLabel(record.event_type)}
          </span>
          <h3 className="mt-2 font-display font-semibold">
            {record.title || recordTypeLabel(record.event_type)}
          </h3>
        </div>
        <p className="text-sm text-paper/60">{formatDate(record.event_date)}</p>
      </div>
      {facts.length > 0 && <p className="mt-2 text-sm text-paper/70">{facts.join(' · ')}</p>}
      {record.description && (
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-paper/70">{record.description}</p>
      )}
      {record.parts_replaced && (
        <p className="mt-2 text-sm text-paper/70">
          <span className="font-medium text-paper/90">Parts replaced:</span> {record.parts_replaced}
        </p>
      )}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-paper/60">
        {record.warranty_until && <span>Warranty until {formatDate(record.warranty_until)}</span>}
        {record.next_due_date && <span>Next due {formatDate(record.next_due_date)}</span>}
        {record.next_due_mileage_km != null && (
          <span>Next due at {record.next_due_mileage_km.toLocaleString('en-IE')} km</span>
        )}
      </div>
      {!isTransfer && (
        <div className="mt-3 flex gap-3 text-sm">
          {confirming ? (
            <>
              <button
                type="button"
                className="font-semibold text-danger hover:underline"
                disabled={del.isPending}
                onClick={() => del.mutate(record.id)}
              >
                {del.isPending ? 'Deleting…' : 'Confirm delete'}
              </button>
              <button type="button" className="text-paper/60 hover:text-paper" onClick={() => setConfirming(false)}>
                Cancel
              </button>
            </>
          ) : (
            <button type="button" className="text-paper/50 hover:text-danger" onClick={() => setConfirming(true)}>
              Delete record
            </button>
          )}
        </div>
      )}
    </li>
  );
}

export function ServiceHistory({ vehicleId }: { vehicleId: string }) {
  const records = useServiceRecords(vehicleId);
  const add = useAddServiceRecord(vehicleId);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function set(key: keyof typeof EMPTY, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = serviceRecordSchema.safeParse(form);
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
    add.mutate(parsed.data, {
      onSuccess: () => {
        setForm(EMPTY);
        setOpen(false);
      },
    });
  }

  return (
    <section aria-labelledby="service-history-heading">
      <div className="flex items-center justify-between">
        <h2 id="service-history-heading" className="font-display text-xl font-bold">
          Service history
        </h2>
        <button type="button" className="btn-primary !px-4 !py-2 text-sm" onClick={() => setOpen((o) => !o)}>
          {open ? 'Close' : 'Add a record'}
        </button>
      </div>
      <p className="mt-1 text-sm text-paper/60">
        The digital service book for this car — it travels with the vehicle if you transfer it.
      </p>

      {open && (
        <form onSubmit={submit} className="mt-4 rounded-hex border border-ink-line bg-ink-soft p-5" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Type of work" htmlFor="sr-type" error={errors.eventType}>
              <select id="sr-type" className={inputCls} value={form.eventType} onChange={(e) => set('eventType', e.target.value)}>
                {SERVICE_RECORD_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Date of work" htmlFor="sr-date" error={errors.eventDate}>
              <input id="sr-date" type="date" className={inputCls} value={form.eventDate} onChange={(e) => set('eventDate', e.target.value)} />
            </Field>
            <Field label="Title (optional)" htmlFor="sr-title" error={errors.title}>
              <input id="sr-title" className={inputCls} placeholder="e.g. Full engine service" value={form.title} onChange={(e) => set('title', e.target.value)} />
            </Field>
            <Field label="Garage (optional)" htmlFor="sr-garage" error={errors.garageName}>
              <input id="sr-garage" className={inputCls} placeholder="Who did the work" value={form.garageName} onChange={(e) => set('garageName', e.target.value)} />
            </Field>
            <Field label="Mileage at service (km, optional)" htmlFor="sr-mileage" error={errors.mileageKm}>
              <input id="sr-mileage" type="number" min={0} className={inputCls} value={form.mileageKm} onChange={(e) => set('mileageKm', e.target.value)} />
            </Field>
            <Field label="Cost (€, optional)" htmlFor="sr-cost" error={errors.costEur}>
              <input id="sr-cost" type="number" min={0} step="0.01" className={inputCls} value={form.costEur} onChange={(e) => set('costEur', e.target.value)} />
            </Field>
          </div>
          <div className="mt-4">
            <Field label="Notes (optional)" htmlFor="sr-desc" error={errors.description}>
              <textarea id="sr-desc" rows={3} className={inputCls} placeholder="What was done" value={form.description} onChange={(e) => set('description', e.target.value)} />
            </Field>
          </div>
          <div className="mt-4">
            <Field label="Parts replaced (optional)" htmlFor="sr-parts" error={errors.partsReplaced}>
              <input id="sr-parts" className={inputCls} placeholder="e.g. front brake pads, oil filter" value={form.partsReplaced} onChange={(e) => set('partsReplaced', e.target.value)} />
            </Field>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Field label="Warranty until (optional)" htmlFor="sr-warranty" error={errors.warrantyUntil}>
              <input id="sr-warranty" type="date" className={inputCls} value={form.warrantyUntil} onChange={(e) => set('warrantyUntil', e.target.value)} />
            </Field>
            <Field label="Next service due (optional)" htmlFor="sr-next-date" error={errors.nextDueDate}>
              <input id="sr-next-date" type="date" className={inputCls} value={form.nextDueDate} onChange={(e) => set('nextDueDate', e.target.value)} />
            </Field>
            <Field label="Next due at (km, optional)" htmlFor="sr-next-km" error={errors.nextDueMileageKm}>
              <input id="sr-next-km" type="number" min={0} className={inputCls} value={form.nextDueMileageKm} onChange={(e) => set('nextDueMileageKm', e.target.value)} />
            </Field>
          </div>
          {add.isError && (
            <p role="alert" className="mt-3 text-sm text-danger">Could not save the record. Try again.</p>
          )}
          <button type="submit" className="btn-primary mt-5" disabled={add.isPending}>
            {add.isPending ? 'Saving…' : 'Save record'}
          </button>
        </form>
      )}

      {records.isPending && <p className="mt-6 text-paper/60">Loading service history…</p>}
      {records.isError && (
        <p role="alert" className="mt-6 text-danger">Could not load the service history. Refresh to try again.</p>
      )}
      {records.data?.length === 0 && !open && (
        <p className="mt-6 rounded-hex border border-ink-line bg-ink-soft p-6 text-sm text-paper/60">
          No records yet. Add past services, repairs, NCTs and parts so the car&rsquo;s history stays with it.
        </p>
      )}
      {!!records.data?.length && (
        <ul className="mt-6 space-y-4">
          {records.data.map((r) => (
            <RecordCard key={r.id} record={r} vehicleId={vehicleId} />
          ))}
        </ul>
      )}
    </section>
  );
}

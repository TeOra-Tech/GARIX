'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import {
  useAddGarageServiceRecord,
  useGarageVehicleHistory,
  useServicedVehicles,
  type ServicedVehicle,
} from '@/lib/garage-pro/queries';
import { SERVICE_RECORD_TYPES, recordTypeLabel } from '@/lib/validation/vehicle-care';
import { ProGate } from '@/components/garages/pro-gate';
import { Field, inputCls } from '@/components/auth/field';
import { formatEur } from '@/lib/vat';
import { cn } from '@/lib/utils';

function vehLabel(v: ServicedVehicle) {
  return [v.year, v.make, v.model].filter(Boolean).join(' ') || 'Vehicle';
}
function fmtDate(d: string) {
  return new Date(`${d}T00:00:00`).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' });
}

const EMPTY = { eventType: 'service', eventDate: '', title: '', description: '', partsReplaced: '', mileageKm: '', costEur: '', warrantyUntil: '', nextDueDate: '' };

function VehiclePanel({ garageId, vehicle }: { garageId: string; vehicle: ServicedVehicle }) {
  const history = useGarageVehicleHistory(garageId, vehicle.vehicle_id);
  const add = useAddGarageServiceRecord(garageId);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);

  function set(k: keyof typeof EMPTY, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.eventDate) { setError('Add the date of work.'); return; }
    setError(null);
    add.mutate(
      {
        vehicleId: vehicle.vehicle_id, eventType: form.eventType, eventDate: form.eventDate,
        title: form.title, description: form.description, partsReplaced: form.partsReplaced,
        mileageKm: form.mileageKm ? Number(form.mileageKm) : null,
        costEur: form.costEur ? Number(form.costEur) : null,
        warrantyUntil: form.warrantyUntil || null, nextDueDate: form.nextDueDate || null,
      },
      { onSuccess: () => { setForm(EMPTY); setOpen(false); } },
    );
  }

  return (
    <div className="mt-4 rounded-hex border border-ink-line bg-ink-soft p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display font-semibold">{vehLabel(vehicle)}</h3>
          <p className="font-mono text-sm text-volt-bright">{vehicle.registration_number}</p>
        </div>
        <button type="button" className="btn-primary !px-4 !py-2 text-sm" onClick={() => setOpen((o) => !o)}>
          {open ? 'Close' : 'Add record'}
        </button>
      </div>

      {open && (
        <form onSubmit={submit} className="mt-4 rounded-lg border border-ink-line p-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Type of work" htmlFor="sr-type">
              <select id="sr-type" className={inputCls} value={form.eventType} onChange={(e) => set('eventType', e.target.value)}>
                {SERVICE_RECORD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
            <Field label="Date of work" htmlFor="sr-date"><input id="sr-date" type="date" className={inputCls} value={form.eventDate} onChange={(e) => set('eventDate', e.target.value)} /></Field>
            <Field label="Title (optional)" htmlFor="sr-title"><input id="sr-title" className={inputCls} value={form.title} onChange={(e) => set('title', e.target.value)} /></Field>
            <Field label="Mileage (km, optional)" htmlFor="sr-km"><input id="sr-km" type="number" min={0} className={inputCls} value={form.mileageKm} onChange={(e) => set('mileageKm', e.target.value)} /></Field>
            <Field label="Cost (€, optional)" htmlFor="sr-cost"><input id="sr-cost" type="number" min={0} step="0.01" className={inputCls} value={form.costEur} onChange={(e) => set('costEur', e.target.value)} /></Field>
            <Field label="Warranty until (optional)" htmlFor="sr-warr"><input id="sr-warr" type="date" className={inputCls} value={form.warrantyUntil} onChange={(e) => set('warrantyUntil', e.target.value)} /></Field>
          </div>
          <div className="mt-4"><Field label="Parts replaced (optional)" htmlFor="sr-parts"><input id="sr-parts" className={inputCls} value={form.partsReplaced} onChange={(e) => set('partsReplaced', e.target.value)} /></Field></div>
          <div className="mt-4"><Field label="Notes (optional)" htmlFor="sr-desc"><textarea id="sr-desc" rows={2} className={inputCls} value={form.description} onChange={(e) => set('description', e.target.value)} /></Field></div>
          {(error || add.isError) && <p role="alert" className="mt-3 text-sm text-danger">{error ?? 'Could not add the record.'}</p>}
          <button type="submit" className="btn-primary mt-4" disabled={add.isPending}>{add.isPending ? 'Saving…' : 'Save record'}</button>
        </form>
      )}

      {history.isPending && <p className="mt-4 text-sm text-paper/60">Loading history…</p>}
      {history.data?.length === 0 && <p className="mt-4 text-sm text-paper/50">No records yet for this vehicle.</p>}
      {!!history.data?.length && (
        <ul className="mt-4 space-y-3">
          {history.data.map((h) => (
            <li key={h.id} className="border-l-2 border-ink-line pl-3 text-sm">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium">{h.title || recordTypeLabel(h.event_type)}</span>
                <span className="text-xs text-paper/50">{fmtDate(h.event_date)}</span>
              </div>
              <p className="text-paper/60">
                {[
                  h.mileage_km != null ? `${h.mileage_km.toLocaleString('en-IE')} km` : null,
                  h.cost_eur != null ? formatEur(Number(h.cost_eur)) : null,
                  h.garage_name,
                ].filter(Boolean).join(' · ')}
              </p>
              {h.parts_replaced && <p className="text-paper/60">Parts: {h.parts_replaced}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ServiceRecordsBody({ garageId }: { garageId: string }) {
  const vehicles = useServicedVehicles(garageId);
  const [openId, setOpenId] = useState<string | null>(null);

  if (vehicles.isPending) return <p className="mt-6 text-paper/60">Loading vehicles…</p>;
  if (vehicles.isError) return <p role="alert" className="mt-6 text-danger">Could not load vehicles. Refresh to try again.</p>;
  if (vehicles.data?.length === 0)
    return (
      <p className="mt-6 rounded-hex border border-ink-line bg-ink-soft p-8 text-center text-paper/60">
        Vehicles you&rsquo;ve serviced (accepted jobs) appear here — add and view their service history.
      </p>
    );

  return (
    <div className="mt-6 space-y-3">
      {vehicles.data!.map((v) => (
        <div key={v.vehicle_id}>
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-hex border border-ink-line bg-ink-soft p-4 text-left transition hover:border-volt/40"
            onClick={() => setOpenId((id) => (id === v.vehicle_id ? null : v.vehicle_id))}
          >
            <span>
              <span className="font-display font-semibold">{vehLabel(v)}</span>
              <span className="ml-2 font-mono text-sm text-volt-bright">{v.registration_number}</span>
              <span className="ml-2 text-sm text-paper/50">
                {v.jobs} job{v.jobs === 1 ? '' : 's'} · {v.record_count} record{v.record_count === 1 ? '' : 's'}
              </span>
            </span>
            <span className={cn('text-paper/40 transition', openId === v.vehicle_id && 'rotate-180')}>▾</span>
          </button>
          {openId === v.vehicle_id && <VehiclePanel garageId={garageId} vehicle={v} />}
        </div>
      ))}
    </div>
  );
}

export default function GarageServiceRecordsPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <section className="py-8">
      <h2 className="font-display text-2xl font-bold">Vehicle service history</h2>
      <p className="mt-1 text-sm text-paper/60">
        Record and review service history for vehicles you&rsquo;ve worked on — it becomes part of the
        car&rsquo;s digital history for its owner.
      </p>
      <ProGate garageId={id} feature="Vehicle service history" body="Keep a full service record for every vehicle you work on — visible to the owner too.">
        <ServiceRecordsBody garageId={id} />
      </ProGate>
    </section>
  );
}

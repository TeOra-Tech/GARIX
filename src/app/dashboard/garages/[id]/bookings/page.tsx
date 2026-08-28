'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import {
  useBookings,
  useCreateBooking,
  useDeleteBooking,
  useUpdateBookingStatus,
  type Booking,
} from '@/lib/garage-pro/queries';
import { ProGate } from '@/components/garages/pro-gate';
import { Field, inputCls } from '@/components/auth/field';
import { cn } from '@/lib/utils';

const STATUSES = ['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'] as const;
const STATUS_STYLE: Record<string, string> = {
  scheduled: 'border-info/50 bg-info/10 text-info',
  confirmed: 'border-volt/50 bg-volt/10 text-volt-bright',
  completed: 'border-success/50 bg-success/10 text-success',
  cancelled: 'border-ink-line text-paper/50',
  no_show: 'border-danger/50 bg-danger/10 text-danger',
};

const EMPTY = { title: '', scheduledAt: '', durationMinutes: '60', customerName: '', customerPhone: '', vehicleReg: '', notes: '' };

function fmt(dt: string) {
  return new Date(dt).toLocaleString('en-IE', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function BookingRow({ garageId, b }: { garageId: string; b: Booking }) {
  const update = useUpdateBookingStatus(garageId);
  const del = useDeleteBooking(garageId);
  const past = new Date(b.scheduled_at) < new Date();

  return (
    <li className="rounded-hex border border-ink-line bg-ink-soft p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display font-semibold">{b.title}</h3>
          <p className="mt-1 text-sm text-paper/60">
            {fmt(b.scheduled_at)} · {b.duration_minutes} min
            {b.customer_name && ` · ${b.customer_name}`}
            {b.vehicle_reg && ` · ${b.vehicle_reg}`}
          </p>
          {b.customer_phone && <p className="text-sm text-paper/50">{b.customer_phone}</p>}
          {b.notes && <p className="mt-1 text-sm text-paper/60">{b.notes}</p>}
        </div>
        <span className={cn('rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize', STATUS_STYLE[b.status])}>
          {b.status.replace('_', ' ')}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <label className="text-paper/50" htmlFor={`st-${b.id}`}>Status</label>
        <select
          id={`st-${b.id}`}
          className={cn(inputCls, '!w-auto !px-2 !py-1 text-sm')}
          value={b.status}
          onChange={(e) => update.mutate({ id: b.id, status: e.target.value })}
        >
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        {past && b.status === 'scheduled' && <span className="text-xs text-warning">past — update status</span>}
        <button type="button" className="ml-auto text-paper/40 hover:text-danger" onClick={() => del.mutate(b.id)}>
          Delete
        </button>
      </div>
    </li>
  );
}

function BookingsBody({ garageId }: { garageId: string }) {
  const bookings = useBookings(garageId);
  const create = useCreateBooking(garageId);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);

  function set(k: keyof typeof EMPTY, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.scheduledAt) { setError('Add a title and a date/time.'); return; }
    setError(null);
    create.mutate(
      {
        title: form.title.trim(),
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        durationMinutes: Number(form.durationMinutes) || 60,
        customerName: form.customerName, customerPhone: form.customerPhone,
        vehicleReg: form.vehicleReg, notes: form.notes,
      },
      { onSuccess: () => { setForm(EMPTY); setOpen(false); } },
    );
  }

  const upcoming = bookings.data?.filter((b) => new Date(b.scheduled_at) >= new Date() && !['cancelled', 'completed'].includes(b.status)) ?? [];
  const rest = bookings.data?.filter((b) => !upcoming.includes(b)) ?? [];

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-paper/60">{upcoming.length} upcoming</p>
        <button type="button" className="btn-primary !px-4 !py-2 text-sm" onClick={() => setOpen((o) => !o)}>
          {open ? 'Close' : 'New booking'}
        </button>
      </div>

      {open && (
        <form onSubmit={submit} className="mt-4 rounded-hex border border-ink-line bg-ink-soft p-5" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title" htmlFor="bk-title"><input id="bk-title" className={inputCls} placeholder="e.g. Full service — 191-D-1234" value={form.title} onChange={(e) => set('title', e.target.value)} /></Field>
            <Field label="Date &amp; time" htmlFor="bk-when"><input id="bk-when" type="datetime-local" className={inputCls} value={form.scheduledAt} onChange={(e) => set('scheduledAt', e.target.value)} /></Field>
            <Field label="Duration (minutes)" htmlFor="bk-dur"><input id="bk-dur" type="number" min={15} step={15} className={inputCls} value={form.durationMinutes} onChange={(e) => set('durationMinutes', e.target.value)} /></Field>
            <Field label="Vehicle reg (optional)" htmlFor="bk-reg"><input id="bk-reg" className={inputCls} value={form.vehicleReg} onChange={(e) => set('vehicleReg', e.target.value)} /></Field>
            <Field label="Customer name (optional)" htmlFor="bk-name"><input id="bk-name" className={inputCls} value={form.customerName} onChange={(e) => set('customerName', e.target.value)} /></Field>
            <Field label="Customer phone (optional)" htmlFor="bk-phone"><input id="bk-phone" className={inputCls} value={form.customerPhone} onChange={(e) => set('customerPhone', e.target.value)} /></Field>
          </div>
          <div className="mt-4">
            <Field label="Notes (optional)" htmlFor="bk-notes"><input id="bk-notes" className={inputCls} value={form.notes} onChange={(e) => set('notes', e.target.value)} /></Field>
          </div>
          {(error || create.isError) && <p role="alert" className="mt-3 text-sm text-danger">{error ?? 'Could not create the booking.'}</p>}
          <button type="submit" className="btn-primary mt-5" disabled={create.isPending}>{create.isPending ? 'Saving…' : 'Create booking'}</button>
        </form>
      )}

      {bookings.isPending && <p className="mt-6 text-paper/60">Loading bookings…</p>}
      {bookings.data?.length === 0 && !open && (
        <p className="mt-6 rounded-hex border border-ink-line bg-ink-soft p-8 text-center text-paper/60">
          No bookings yet — schedule your first appointment.
        </p>
      )}

      {upcoming.length > 0 && (
        <>
          <h3 className="mt-8 font-display text-lg font-semibold">Upcoming</h3>
          <ul className="mt-4 space-y-4">{upcoming.map((b) => <BookingRow key={b.id} garageId={garageId} b={b} />)}</ul>
        </>
      )}
      {rest.length > 0 && (
        <>
          <h3 className="mt-8 font-display text-lg font-semibold">Past &amp; closed</h3>
          <ul className="mt-4 space-y-4">{rest.map((b) => <BookingRow key={b.id} garageId={garageId} b={b} />)}</ul>
        </>
      )}
    </div>
  );
}

export default function GarageBookingsPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <section className="py-8">
      <h2 className="font-display text-2xl font-bold">Bookings</h2>
      <p className="mt-1 text-sm text-paper/60">Schedule and track appointments.</p>
      <ProGate garageId={id} feature="Booking management" body="Schedule appointments, track their status, and keep your day organised.">
        <BookingsBody garageId={id} />
      </ProGate>
    </section>
  );
}

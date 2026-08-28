'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import {
  useCompleteGarageReminder,
  useCreateGarageReminder,
  useDeleteGarageReminder,
  useGarageReminders,
  type GarageReminder,
} from '@/lib/garage-pro/queries';
import { useGarageCustomers } from '@/lib/garages/portal';
import { REMINDER_TYPES, reminderTypeLabel } from '@/lib/validation/vehicle-care';
import { ProGate } from '@/components/garages/pro-gate';
import { Field, inputCls } from '@/components/auth/field';
import { cn } from '@/lib/utils';

const EMPTY = { reminderType: 'service', title: '', dueDate: '', message: '', customerId: '', customerName: '', vehicleReg: '', notifyCustomer: true };

function dueInfo(due: string): { text: string; cls: string } {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(`${due}T00:00:00`);
  const days = Math.round((d.getTime() - today.getTime()) / 86_400_000);
  const s = d.toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' });
  if (days < 0) return { text: `Overdue — ${s}`, cls: 'text-danger' };
  if (days === 0) return { text: 'Due today', cls: 'text-danger' };
  if (days <= 7) return { text: `Due ${s} (in ${days}d)`, cls: 'text-warning' };
  return { text: `Due ${s}`, cls: 'text-paper/60' };
}

function ReminderRow({ garageId, r }: { garageId: string; r: GarageReminder }) {
  const complete = useCompleteGarageReminder(garageId);
  const del = useDeleteGarageReminder(garageId);
  const done = !!r.completed_at;
  const due = dueInfo(r.due_date);
  return (
    <li className={cn('rounded-hex border border-ink-line bg-ink-soft p-5', done && 'opacity-60')}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display font-semibold">{r.title || reminderTypeLabel(r.reminder_type)}</h3>
          <p className={cn('mt-1 text-sm font-medium', done ? 'text-paper/50' : due.cls)}>
            {done ? 'Done' : due.text}
            {r.customer_name && ` · ${r.customer_name}`}
            {r.vehicle_reg && ` · ${r.vehicle_reg}`}
          </p>
          {r.message && <p className="mt-1 text-sm text-paper/60">{r.message}</p>}
          <p className="mt-1 text-xs text-paper/40">
            {r.notify_customer ? 'Customer will be notified when due' : 'Internal reminder only'}
          </p>
        </div>
        <div className="flex gap-3 text-sm">
          {!done && (
            <button type="button" className="btn-ghost !px-3 !py-1.5" disabled={complete.isPending} onClick={() => complete.mutate(r.id)}>
              Mark done
            </button>
          )}
          <button type="button" className="text-paper/40 hover:text-danger" onClick={() => del.mutate(r.id)}>Delete</button>
        </div>
      </div>
    </li>
  );
}

function RemindersBody({ garageId }: { garageId: string }) {
  const reminders = useGarageReminders(garageId);
  const create = useCreateGarageReminder(garageId);
  const customers = useGarageCustomers(garageId);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof EMPTY>(k: K, v: (typeof EMPTY)[K]) { setForm((f) => ({ ...f, [k]: v })); }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.dueDate) { setError('Pick a due date.'); return; }
    if (form.reminderType === 'other' && !form.title.trim()) { setError('Give the reminder a name.'); return; }
    setError(null);
    create.mutate(
      { reminderType: form.reminderType, title: form.title, dueDate: form.dueDate, message: form.message, customerId: form.customerId || null, customerName: form.customerName, vehicleReg: form.vehicleReg, notifyCustomer: form.notifyCustomer },
      { onSuccess: () => { setForm(EMPTY); setOpen(false); } },
    );
  }

  const active = reminders.data?.filter((r) => !r.completed_at) ?? [];
  const done = reminders.data?.filter((r) => r.completed_at) ?? [];

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-paper/60">
          Automatic reminders notify the customer (and you) when due.
        </p>
        <button type="button" className="btn-primary !px-4 !py-2 text-sm" onClick={() => setOpen((o) => !o)}>
          {open ? 'Close' : 'New reminder'}
        </button>
      </div>

      {open && (
        <form onSubmit={submit} className="mt-4 rounded-hex border border-ink-line bg-ink-soft p-5" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Type" htmlFor="rm-type">
              <select id="rm-type" className={inputCls} value={form.reminderType} onChange={(e) => set('reminderType', e.target.value)}>
                {REMINDER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
            <Field label="Due date" htmlFor="rm-due"><input id="rm-due" type="date" className={inputCls} value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} /></Field>
            {form.reminderType === 'other' && (
              <Field label="Name" htmlFor="rm-title"><input id="rm-title" className={inputCls} value={form.title} onChange={(e) => set('title', e.target.value)} /></Field>
            )}
            <Field label="Link a customer (optional)" htmlFor="rm-cust">
              <select
                id="rm-cust"
                className={inputCls}
                value={form.customerId}
                onChange={(e) => {
                  const c = customers.data?.find((x) => x.customer_id === e.target.value);
                  setForm((f) => ({ ...f, customerId: e.target.value, customerName: c?.full_name ?? f.customerName }));
                }}
              >
                <option value="">Not linked (won&rsquo;t notify a customer)</option>
                {customers.data?.map((c) => (
                  <option key={c.customer_id} value={c.customer_id}>{c.full_name} — {c.email}</option>
                ))}
              </select>
            </Field>
            <Field label="Vehicle reg (optional)" htmlFor="rm-reg"><input id="rm-reg" className={inputCls} value={form.vehicleReg} onChange={(e) => set('vehicleReg', e.target.value)} /></Field>
          </div>
          <div className="mt-4">
            <Field label="Message (optional)" htmlFor="rm-msg"><input id="rm-msg" className={inputCls} placeholder="Shown to the customer in the reminder" value={form.message} onChange={(e) => set('message', e.target.value)} /></Field>
          </div>
          <label className="mt-4 flex items-center gap-2 text-sm text-paper/70">
            <input type="checkbox" className="h-4 w-4 accent-volt" checked={form.notifyCustomer} onChange={(e) => set('notifyCustomer', e.target.checked)} />
            Notify the customer when this is due (if they have a Garix account linked)
          </label>
          {(error || create.isError) && <p role="alert" className="mt-3 text-sm text-danger">{error ?? 'Could not create the reminder.'}</p>}
          <button type="submit" className="btn-primary mt-5" disabled={create.isPending}>{create.isPending ? 'Saving…' : 'Create reminder'}</button>
        </form>
      )}

      {reminders.isPending && <p className="mt-6 text-paper/60">Loading reminders…</p>}
      {reminders.data?.length === 0 && !open && (
        <p className="mt-6 rounded-hex border border-ink-line bg-ink-soft p-8 text-center text-paper/60">
          No reminders yet — set service or NCT reminders and Garix will notify customers automatically.
        </p>
      )}
      {active.length > 0 && <ul className="mt-6 space-y-4">{active.map((r) => <ReminderRow key={r.id} garageId={garageId} r={r} />)}</ul>}
      {done.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-paper/50 hover:text-paper/80">Completed ({done.length})</summary>
          <ul className="mt-3 space-y-3">{done.map((r) => <ReminderRow key={r.id} garageId={garageId} r={r} />)}</ul>
        </details>
      )}
    </div>
  );
}

export default function GarageRemindersPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <section className="py-8">
      <h2 className="font-display text-2xl font-bold">Automated reminders</h2>
      <p className="mt-1 text-sm text-paper/60">Bring customers back for their next service, NCT and more.</p>
      <ProGate garageId={id} feature="Automated reminders" body="Set service, NCT and other reminders that automatically notify your customers when due.">
        <RemindersBody garageId={id} />
      </ProGate>
    </section>
  );
}

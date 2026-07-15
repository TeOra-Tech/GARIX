'use client';

import { useState } from 'react';
import {
  useAddReminder,
  useCompleteReminder,
  useDeleteReminder,
  useReminders,
  type ReminderRow,
} from '@/lib/vehicles/care';
import { REMINDER_TYPES, reminderSchema, reminderTypeLabel } from '@/lib/validation/vehicle-care';
import { Field, inputCls } from '@/components/auth/field';
import { cn } from '@/lib/utils';

const EMPTY = {
  reminderType: 'nct',
  title: '',
  dueDate: '',
  dueMileageKm: '',
  intervalMonths: '',
  notes: '',
};

function dueInfo(dueDate: string): { text: string; cls: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${dueDate}T00:00:00`);
  const days = Math.round((due.getTime() - today.getTime()) / 86_400_000);
  const dateStr = due.toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' });
  if (days < 0) return { text: `Overdue — was due ${dateStr}`, cls: 'text-danger' };
  if (days === 0) return { text: 'Due today', cls: 'text-danger' };
  if (days <= 14) return { text: `Due ${dateStr} (in ${days} day${days === 1 ? '' : 's'})`, cls: 'text-warning' };
  return { text: `Due ${dateStr}`, cls: 'text-paper/60' };
}

function ReminderCard({ reminder }: { reminder: ReminderRow }) {
  const complete = useCompleteReminder();
  const del = useDeleteReminder();
  const due = dueInfo(reminder.due_date);
  const isDone = !!reminder.completed_at;

  return (
    <li className={cn('rounded-hex border border-ink-line bg-ink-soft p-5', isDone && 'opacity-60')}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display font-semibold">
            {reminder.title || reminderTypeLabel(reminder.reminder_type)}
            {reminder.interval_months && !isDone && (
              <span className="ml-2 rounded-full border border-ink-line px-2 py-0.5 text-xs font-medium text-paper/60">
                every {reminder.interval_months} mo
              </span>
            )}
          </h3>
          <p className={cn('mt-1 text-sm font-medium', isDone ? 'text-paper/50' : due.cls)}>
            {isDone ? 'Done' : due.text}
            {reminder.due_mileage_km != null && ` · at ${reminder.due_mileage_km.toLocaleString('en-IE')} km`}
          </p>
          {reminder.notes && <p className="mt-1 text-sm text-paper/60">{reminder.notes}</p>}
        </div>
        <div className="flex gap-3 text-sm">
          {!isDone && (
            <button
              type="button"
              className="btn-ghost !px-3 !py-1.5"
              disabled={complete.isPending}
              onClick={() => complete.mutate(reminder)}
            >
              {reminder.interval_months ? 'Done — next one' : 'Mark done'}
            </button>
          )}
          <button
            type="button"
            className="text-paper/50 hover:text-danger"
            disabled={del.isPending}
            onClick={() => del.mutate(reminder.id)}
          >
            Delete
          </button>
        </div>
      </div>
    </li>
  );
}

export function Reminders({ vehicleId }: { vehicleId: string }) {
  const reminders = useReminders(vehicleId);
  const add = useAddReminder(vehicleId);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function set(key: keyof typeof EMPTY, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = reminderSchema.safeParse(form);
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

  const active = reminders.data?.filter((r) => !r.completed_at) ?? [];
  const done = reminders.data?.filter((r) => r.completed_at) ?? [];

  return (
    <section aria-labelledby="reminders-heading">
      <div className="flex items-center justify-between">
        <h2 id="reminders-heading" className="font-display text-xl font-bold">
          Service &amp; maintenance reminders
        </h2>
        <button type="button" className="btn-primary !px-4 !py-2 text-sm" onClick={() => setOpen((o) => !o)}>
          {open ? 'Close' : 'Add a reminder'}
        </button>
      </div>
      <p className="mt-1 text-sm text-paper/60">
        We&rsquo;ll notify you 14 days before each one is due — NCT, oil service, tyres, insurance,
        road tax and more.
      </p>

      {open && (
        <form onSubmit={submit} className="mt-4 rounded-hex border border-ink-line bg-ink-soft p-5" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Reminder" htmlFor="rm-type" error={errors.reminderType}>
              <select id="rm-type" className={inputCls} value={form.reminderType} onChange={(e) => set('reminderType', e.target.value)}>
                {REMINDER_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Due date" htmlFor="rm-date" error={errors.dueDate}>
              <input id="rm-date" type="date" className={inputCls} value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} />
            </Field>
            {form.reminderType === 'other' && (
              <Field label="Name" htmlFor="rm-title" error={errors.title}>
                <input id="rm-title" className={inputCls} placeholder="e.g. Coolant flush" value={form.title} onChange={(e) => set('title', e.target.value)} />
              </Field>
            )}
            <Field label="Or due at mileage (km, optional)" htmlFor="rm-km" error={errors.dueMileageKm}>
              <input id="rm-km" type="number" min={0} className={inputCls} value={form.dueMileageKm} onChange={(e) => set('dueMileageKm', e.target.value)} />
            </Field>
            <Field label="Repeat every (months, optional)" htmlFor="rm-interval" error={errors.intervalMonths}>
              <input id="rm-interval" type="number" min={1} max={120} className={inputCls} placeholder="e.g. 12" value={form.intervalMonths} onChange={(e) => set('intervalMonths', e.target.value)} />
            </Field>
          </div>
          <div className="mt-4">
            <Field label="Notes (optional)" htmlFor="rm-notes" error={errors.notes}>
              <input id="rm-notes" className={inputCls} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
            </Field>
          </div>
          {add.isError && (
            <p role="alert" className="mt-3 text-sm text-danger">Could not save the reminder. Try again.</p>
          )}
          <button type="submit" className="btn-primary mt-5" disabled={add.isPending}>
            {add.isPending ? 'Saving…' : 'Save reminder'}
          </button>
        </form>
      )}

      {reminders.isPending && <p className="mt-6 text-paper/60">Loading reminders…</p>}
      {reminders.isError && (
        <p role="alert" className="mt-6 text-danger">Could not load reminders. Refresh to try again.</p>
      )}
      {reminders.data?.length === 0 && !open && (
        <p className="mt-6 rounded-hex border border-ink-line bg-ink-soft p-6 text-sm text-paper/60">
          No reminders yet. Set up NCT, oil service, insurance and road tax so nothing slips.
        </p>
      )}
      {active.length > 0 && (
        <ul className="mt-6 space-y-4">
          {active.map((r) => (
            <ReminderCard key={r.id} reminder={r} />
          ))}
        </ul>
      )}
      {done.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-paper/50 hover:text-paper/80">
            Completed ({done.length})
          </summary>
          <ul className="mt-3 space-y-3">
            {done.map((r) => (
              <ReminderCard key={r.id} reminder={r} />
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

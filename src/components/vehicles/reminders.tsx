'use client';

import { useState } from 'react';
import {
  useAddReminder,
  useCompleteReminder,
  useDeleteReminder,
  useReminders,
  useRenewReminder,
  type ReminderRow,
} from '@/lib/vehicles/care';
import {
  REMINDER_TYPES,
  TAX_DURATIONS,
  addMonthsIso,
  completeReminderDates,
  isComplianceType,
  nctExpiryFromTest,
  nctExempt,
  nctNotDueYet,
  noticeSummary,
  reminderSchema,
  reminderTypeLabel,
  type VehicleReg,
} from '@/lib/validation/vehicle-care';
import { Field, inputCls } from '@/components/auth/field';
import { cn } from '@/lib/utils';

type Form = {
  reminderType: string;
  title: string;
  startDate: string;
  dueDate: string;
  durationMonths: string;
  dueMileageKm: string;
  intervalMonths: string;
  notes: string;
};

const EMPTY: Form = {
  reminderType: 'nct',
  title: '',
  startDate: '',
  dueDate: '',
  durationMonths: '',
  dueMileageKm: '',
  intervalMonths: '',
  notes: '',
};
// Consumable reminders (oil, tyres…) can no longer be added; older ones show with "Mark done".

const INSURANCE_LENGTHS = [12, 6, 3, 1];
const isoRe = /^\d{4}-\d{2}-\d{2}$/;

function dueInfo(reminder: ReminderRow): { text: string; cls: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${reminder.due_date}T00:00:00`);
  const days = Math.round((due.getTime() - today.getTime()) / 86_400_000);
  const dateStr = due.toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' });
  const expires = isComplianceType(reminder.reminder_type) && reminder.reminder_type !== 'service';
  if (days < 0) return { text: expires ? `Expired ${dateStr}` : `Overdue — was due ${dateStr}`, cls: 'text-danger' };
  if (days === 0) return { text: expires ? 'Expires today' : 'Due today', cls: 'text-danger' };
  const word = expires ? 'Expires' : 'Due';
  if (days <= 30) return { text: `${word} ${dateStr} (in ${days} day${days === 1 ? '' : 's'})`, cls: 'text-warning' };
  return { text: `${word} ${dateStr}`, cls: 'text-paper/70' };
}

function errorsOf(issues: { path: (string | number)[]; message: string }[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.join('.');
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/** Add form, or the renewal form for an NCT/tax/insurance/service reminder (`renewing`). */
function ReminderForm({
  vehicleId,
  reg,
  renewing,
  onDone,
}: {
  vehicleId: string;
  reg: VehicleReg;
  renewing?: ReminderRow;
  onDone: () => void;
}) {
  const add = useAddReminder(vehicleId);
  const renew = useRenewReminder();
  const [form, setForm] = useState<Form>(
    renewing
      ? { ...EMPTY, reminderType: renewing.reminder_type, durationMonths: renewing.duration_months ? String(renewing.duration_months) : '' }
      : EMPTY,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const t = form.reminderType;
  // Under 4 years old there's no test yet, only the first due date (not for renewals).
  const todayIso = new Date().toISOString().slice(0, 10);
  const newCar = !renewing && nctNotDueYet(reg, todayIso);
  const exempt = nctExempt(reg, todayIso);
  const pending = add.isPending || renew.isPending;
  const failed = add.isError || renew.isError;

  function set(key: keyof Form, value: string) {
    setForm((f) => {
      const next = { ...f, [key]: value };
      // Suggest the expiry as the user fills in the start and length (they can change it).
      if (key === 'startDate' && isoRe.test(value)) {
        if (next.reminderType === 'nct') next.dueDate = nctExpiryFromTest(reg, value, renewing?.due_date);
        if (next.reminderType === 'insurance' && Number(next.durationMonths)) next.dueDate = addMonthsIso(value, Number(next.durationMonths));
      }
      if (key === 'durationMonths' && next.reminderType === 'insurance' && isoRe.test(next.startDate) && Number(value)) {
        next.dueDate = addMonthsIso(next.startDate, Number(value));
      }
      if (key === 'reminderType') {
        next.startDate = '';
        next.dueDate = '';
        next.durationMonths = value === 'insurance' ? '12' : '';
      }
      return next;
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = reminderSchema.safeParse(completeReminderDates(form, reg, renewing?.due_date));
    if (!parsed.success) return setErrors(errorsOf(parsed.error.issues));
    setErrors({});
    if (renewing) renew.mutate({ id: renewing.id, data: parsed.data }, { onSuccess: onDone });
    else add.mutate(parsed.data, { onSuccess: onDone });
  }

  const dateField = (key: 'startDate' | 'dueDate', label: string, hint?: string) => (
    <Field label={label} htmlFor={`rm-${key}-${renewing?.id ?? 'new'}`} error={errors[key]}>
      <input
        id={`rm-${key}-${renewing?.id ?? 'new'}`}
        type="date"
        className={inputCls}
        value={form[key]}
        aria-describedby={hint ? `rm-${key}-hint` : undefined}
        onChange={(e) => set(key, e.target.value)}
      />
      {hint && <p id={`rm-${key}-hint`} className="mt-1 text-xs text-paper/70">{hint}</p>}
    </Field>
  );

  return (
    <form onSubmit={submit} className="mt-4 rounded-hex border border-ink-line bg-ink-soft p-5" noValidate>
      {renewing && (
        <p className="mb-4 font-display font-semibold">
          Renewed {reminderTypeLabel(renewing.reminder_type).toLowerCase()}: enter the new dates
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {!renewing && (
          <Field label="Reminder" htmlFor="rm-type" error={errors.reminderType}>
            <select id="rm-type" className={inputCls} value={t} onChange={(e) => set('reminderType', e.target.value)}>
              {REMINDER_TYPES.map((rt) => (
                <option key={rt.value} value={rt.value}>{rt.label}</option>
              ))}
            </select>
          </Field>
        )}

        {t === 'nct' && exempt && (
          <p className="text-sm text-paper/70 sm:col-span-2">Cars 40 years and older don’t need an NCT, so there’s nothing to remind you about.</p>
        )}
        {t === 'nct' && !exempt && (newCar ? (
          dateField('dueDate', 'First NCT due date', 'Cars don’t need an NCT until they’re 4 years old. The first test is due on the 4th anniversary of first registration.')
        ) : (
          <>
            {dateField('startDate', 'NCT test date')}
            {dateField('dueDate', 'NCT expiry date', 'Worked out from the test date using the NCT rules. Check it matches your certificate.')}
          </>
        ))}

        {t === 'road_tax' && (
          <>
            <Field label="Tax period" htmlFor="rm-duration" error={errors.durationMonths}>
              <select id="rm-duration" className={inputCls} value={form.durationMonths} onChange={(e) => set('durationMonths', e.target.value)}>
                <option value="">Choose…</option>
                {TAX_DURATIONS.map((m) => (
                  <option key={m} value={m}>{m} months</option>
                ))}
              </select>
            </Field>
            {dateField('dueDate', 'Tax expiry date')}
          </>
        )}

        {t === 'insurance' && (
          <>
            <Field label="Policy length" htmlFor="rm-duration" error={errors.durationMonths}>
              <select id="rm-duration" className={inputCls} value={form.durationMonths} onChange={(e) => set('durationMonths', e.target.value)}>
                {INSURANCE_LENGTHS.map((m) => (
                  <option key={m} value={m}>{m === 12 ? '1 year' : `${m} month${m === 1 ? '' : 's'}`}</option>
                ))}
              </select>
            </Field>
            {dateField('startDate', 'Start date')}
            {dateField('dueDate', 'End date')}
          </>
        )}

        {t === 'service' && dateField('dueDate', 'Next service due')}

      </div>
      <div className="mt-4">
        <Field label="Notes (optional)" htmlFor={`rm-notes-${renewing?.id ?? 'new'}`} error={errors.notes}>
          <input id={`rm-notes-${renewing?.id ?? 'new'}`} className={inputCls} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        </Field>
      </div>
      <p className="mt-3 text-sm text-paper/70">{noticeSummary(t, reg, isoRe.test(form.dueDate) ? form.dueDate : null)}</p>
      {failed && (
        <p role="alert" className="mt-3 text-sm text-danger">Could not save the reminder. Try again.</p>
      )}
      <div className="mt-5 flex gap-3">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? 'Saving…' : renewing ? 'Save renewal' : 'Save reminder'}
        </button>
        {renewing && (
          <button type="button" className="btn-ghost" onClick={onDone}>Cancel</button>
        )}
      </div>
    </form>
  );
}

function ReminderCard({ reminder, reg }: { reminder: ReminderRow; reg: VehicleReg }) {
  const complete = useCompleteReminder();
  const del = useDeleteReminder();
  const [renewing, setRenewing] = useState(false);
  const due = dueInfo(reminder);
  const isDone = !!reminder.completed_at;
  const compliance = isComplianceType(reminder.reminder_type);

  return (
    <li className={cn('rounded-hex border border-ink-line bg-ink-soft p-5', isDone && 'opacity-60')}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display font-semibold">
            {reminder.title || reminderTypeLabel(reminder.reminder_type)}
            {reminder.interval_months && !isDone && (
              <span className="ml-2 rounded-full border border-ink-line px-2 py-0.5 text-xs font-medium text-paper/70">
                every {reminder.interval_months} mo
              </span>
            )}
          </h3>
          <p className={cn('mt-1 text-sm font-medium', isDone ? 'text-paper/70' : due.cls)}>
            {isDone ? 'Done' : due.text}
            {reminder.due_mileage_km != null && ` · at ${reminder.due_mileage_km.toLocaleString('en-IE')} km`}
          </p>
          {reminder.notes && <p className="mt-1 text-sm text-paper/70">{reminder.notes}</p>}
        </div>
        <div className="flex gap-3 text-sm">
          {!isDone && compliance && (
            <button type="button" className="btn-ghost !px-3 !py-1.5" onClick={() => setRenewing((r) => !r)}>
              {reminder.reminder_type === 'service' ? 'Serviced — next due date' : 'Renewed — add new dates'}
            </button>
          )}
          {!isDone && !compliance && (
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
            className="text-paper/70 hover:text-danger"
            disabled={del.isPending}
            onClick={() => del.mutate(reminder.id)}
          >
            Delete
          </button>
        </div>
      </div>
      {renewing && (
        <ReminderForm vehicleId={reminder.vehicle_id} reg={reg} renewing={reminder} onDone={() => setRenewing(false)} />
      )}
    </li>
  );
}

export function Reminders({ vehicleId, reg = null }: { vehicleId: string; reg?: VehicleReg }) {
  const reminders = useReminders(vehicleId);
  const [open, setOpen] = useState(false);

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
      <p className="mt-1 text-sm text-paper/70">
        NCT, motor tax, insurance and service: we&rsquo;ll remind you before they run out, on the last
        day, and every Monday after until you add the renewal.
      </p>

      {open && <ReminderForm vehicleId={vehicleId} reg={reg} onDone={() => setOpen(false)} />}

      {reminders.isPending && <p className="mt-6 text-paper/70">Loading reminders…</p>}
      {reminders.isError && (
        <p role="alert" className="mt-6 text-danger">Could not load reminders. Refresh to try again.</p>
      )}
      {reminders.data?.length === 0 && !open && (
        <p className="mt-6 rounded-hex border border-ink-line bg-ink-soft p-6 text-sm text-paper/70">
          No reminders yet. Set up NCT, motor tax, insurance and service so nothing slips.
        </p>
      )}
      {active.length > 0 && (
        <ul className="mt-6 space-y-4">
          {active.map((r) => (
            <ReminderCard key={r.id} reminder={r} reg={reg} />
          ))}
        </ul>
      )}
      {done.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-paper/70 hover:text-paper/80">
            Completed ({done.length})
          </summary>
          <ul className="mt-3 space-y-3">
            {done.map((r) => (
              <ReminderCard key={r.id} reminder={r} reg={reg} />
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

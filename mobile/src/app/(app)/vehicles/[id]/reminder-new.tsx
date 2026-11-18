import { useState } from 'react';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import {
  REMINDER_TYPES,
  TAX_DURATIONS,
  addMonthsIso,
  completeReminderDates,
  nctExpiryFromTest,
  nctExempt,
  nctFirstDue,
  nctNotDueYet,
  noticeSummary,
  reminderSchema,
  reminderTypeLabel,
} from '@/shared/validation/vehicle-care';
import { useAddReminder, useReminders, useRenewReminder } from '@/lib/vehicle-care';
import { useVehicle } from '@/lib/queries';
import { DateField } from '@/components/date-field';
import { Body, Button, ErrorText, Muted, Screen, SelectField, TextField } from '@/components/ui';
import { fonts } from '@/lib/theme';

type ReminderType = (typeof REMINDER_TYPES)[number]['value'];
type Form = {
  reminderType: ReminderType | ''; title: string; startDate: string; dueDate: string; durationMonths: string;
  dueMileageKm: string; intervalMonths: string; notes: string;
};
const EMPTY: Form = { reminderType: '', title: '', startDate: '', dueDate: '', durationMonths: '', dueMileageKm: '', intervalMonths: '', notes: '' };

const TAX_OPTIONS = TAX_DURATIONS.map((m) => ({ value: String(m), label: `${m} months` }));
const INSURANCE_OPTIONS = [12, 6, 3, 1].map((m) => ({ value: String(m), label: m === 12 ? '1 year' : `${m} month${m === 1 ? '' : 's'}` }));
const isoRe = /^\d{4}-\d{2}-\d{2}$/;

/** Add a reminder, or (with ?renew=<reminderId>) enter the renewal of an NCT/tax/insurance/service one. */
export default function NewReminder() {
  const { id, renew: renewId } = useLocalSearchParams<{ id: string; renew?: string }>();
  const vehicle = useVehicle(id);
  const reminders = useReminders(id);
  const renewing = renewId ? reminders.data?.find((r) => r.id === renewId) : undefined;
  const add = useAddReminder(id);
  const renew = useRenewReminder();
  const reg = vehicle.data ? { year: vehicle.data.year, firstRegistrationDate: vehicle.data.first_registration_date } : null;

  const [f, setF] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  // In renew mode the type comes from the reminder being renewed.
  const type = (renewing?.reminder_type as ReminderType | undefined) ?? f.reminderType;
  // Under 4 years old there's no NCT test yet, only the first due date (not for renewals).
  const todayIso = new Date().toISOString().slice(0, 10);
  const newCar = !renewing && nctNotDueYet(reg, todayIso);
  const exempt = nctExempt(reg, todayIso);
  const durationMonths = f.durationMonths || (renewing?.duration_months ? String(renewing.duration_months) : type === 'insurance' ? '12' : '');

  function set<K extends keyof Form>(k: K, v: Form[K]) {
    setF((s) => {
      const next = { ...s, [k]: v, durationMonths: k === 'durationMonths' ? (v as string) : s.durationMonths || durationMonths };
      // Suggest the expiry from the start and length (the user can still change it).
      if (k === 'startDate' && isoRe.test(v as string)) {
        if (type === 'nct') next.dueDate = nctExpiryFromTest(reg, v as string, renewing?.due_date);
        if (type === 'insurance' && Number(next.durationMonths)) next.dueDate = addMonthsIso(v as string, Number(next.durationMonths));
      }
      if (k === 'durationMonths' && type === 'insurance' && isoRe.test(next.startDate)) next.dueDate = addMonthsIso(next.startDate, Number(v));
      if (k === 'reminderType') {
        next.startDate = '';
        next.dueDate = '';
        next.durationMonths = v === 'insurance' ? '12' : '';
        if (v === 'nct' && newCar) next.dueDate = nctFirstDue(reg) ?? '';
      }
      return next;
    });
  }

  function save() {
    const parsed = reminderSchema.safeParse(completeReminderDates({ ...f, reminderType: type, durationMonths }, reg, renewing?.due_date));
    if (!parsed.success) {
      const e: Record<string, string> = {};
      for (const i of parsed.error.issues) e[i.path.join('.')] ??= i.path[0] === 'reminderType' ? 'Choose what to remind you about' : i.message;
      return setErrors(e);
    }
    setErrors({});
    if (renewing) renew.mutate({ id: renewing.id, data: parsed.data }, { onSuccess: () => router.back() });
    else add.mutate(parsed.data, { onSuccess: () => router.back() });
  }

  const pending = add.isPending || renew.isPending;
  const failed = add.isError || renew.isError;

  return (
    <Screen edges={['bottom']}>
      {renewing && <Stack.Screen options={{ title: 'Add renewal' }} />}
      {renewing ? (
        <Body style={{ fontFamily: fonts.semibold }}>Renewed {reminderTypeLabel(renewing.reminder_type).toLowerCase()}: enter the new dates</Body>
      ) : (
        <SelectField label="Remind me about" value={f.reminderType} options={REMINDER_TYPES.map((t) => ({ value: t.value, label: t.label }))}
          onChange={(v) => set('reminderType', v)} error={errors['reminderType']} />
      )}

      {type === 'nct' && exempt && <Muted>Cars 40 years and older don’t need an NCT, so there’s nothing to remind you about.</Muted>}
      {type === 'nct' && !exempt && (newCar ? (
        <>
          <DateField label="First NCT due date" value={f.dueDate} onChange={(v) => set('dueDate', v)} error={errors['dueDate']} />
          <Muted>Cars don’t need an NCT until they’re 4 years old. The first test is due on the 4th anniversary of first registration{nctFirstDue(reg) ? '' : ' (add the registration date on the vehicle to fill this in)'}.</Muted>
        </>
      ) : (
        <>
          <DateField label="NCT test date" value={f.startDate} onChange={(v) => set('startDate', v)} error={errors['startDate']} maximumDate={new Date()} />
          <DateField label="NCT expiry date" value={f.dueDate} onChange={(v) => set('dueDate', v)} error={errors['dueDate']} />
          <Muted>Worked out from the test date using the NCT rules. Check it matches your NCT certificate.</Muted>
        </>
      ))}
      {type === 'road_tax' && (
        <>
          <SelectField label="Tax period" value={durationMonths} options={TAX_OPTIONS} onChange={(v) => set('durationMonths', v)} error={errors['durationMonths']} />
          <DateField label="Tax expiry date" value={f.dueDate} onChange={(v) => set('dueDate', v)} error={errors['dueDate']} />
        </>
      )}
      {type === 'insurance' && (
        <>
          <SelectField label="Policy length" value={durationMonths} options={INSURANCE_OPTIONS} onChange={(v) => set('durationMonths', v)} error={errors['durationMonths']} />
          <DateField label="Start date" value={f.startDate} onChange={(v) => set('startDate', v)} error={errors['startDate']} />
          <DateField label="End date" value={f.dueDate} onChange={(v) => set('dueDate', v)} error={errors['dueDate']} />
        </>
      )}
      {type === 'service' && (
        <DateField label="Next service due" value={f.dueDate} onChange={(v) => set('dueDate', v)} error={errors['dueDate']} minimumDate={new Date()} />
      )}
      <TextField label="Notes (optional)" value={f.notes} onChangeText={(v) => set('notes', v)} maxLength={1000} />
      {type !== '' && <Muted>{noticeSummary(type, reg, isoRe.test(f.dueDate) ? f.dueDate : null)}</Muted>}
      <ErrorText>{failed ? 'Could not save the reminder. Try again.' : null}</ErrorText>
      <Button title={renewing ? 'Save renewal' : 'Save reminder'} onPress={save} loading={pending} />
    </Screen>
  );
}

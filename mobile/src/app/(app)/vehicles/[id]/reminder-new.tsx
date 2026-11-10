import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { REMINDER_TYPES, reminderSchema } from '@/shared/validation/vehicle-care';
import { useAddReminder } from '@/lib/vehicle-care';
import { DateField } from '@/components/date-field';
import { Button, ErrorText, Muted, Screen, SelectField, TextField } from '@/components/ui';

type ReminderType = (typeof REMINDER_TYPES)[number]['value'];
const REPEATS: { value: '0' | '6' | '12' | '24'; label: string }[] = [
  { value: '0', label: 'Does not repeat' },
  { value: '6', label: 'Every 6 months' },
  { value: '12', label: 'Every year' },
  { value: '24', label: 'Every 2 years' },
];

export default function NewReminder() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const add = useAddReminder(id);
  const [f, setF] = useState({ reminderType: '' as ReminderType | '', title: '', dueDate: '', dueMileageKm: '', intervalMonths: '', notes: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));

  function save() {
    const parsed = reminderSchema.safeParse(f);
    if (!parsed.success) {
      const e: Record<string, string> = {};
      for (const i of parsed.error.issues) e[i.path.join('.')] ??= i.path[0] === 'reminderType' ? 'Choose what to remind you about' : i.message;
      return setErrors(e);
    }
    setErrors({});
    add.mutate(parsed.data, { onSuccess: () => router.back() });
  }

  return (
    <Screen edges={['bottom']}>
      <SelectField label="Remind me about" value={f.reminderType} options={REMINDER_TYPES.map((t) => ({ value: t.value, label: t.label }))}
        onChange={(v) => set('reminderType', v)} error={errors['reminderType']} />
      {f.reminderType === 'other' && (
        <TextField label="Name" value={f.title} onChangeText={(v) => set('title', v)} maxLength={120} error={errors['title']} />
      )}
      <DateField label="Due date" value={f.dueDate} onChange={(v) => set('dueDate', v)} error={errors['dueDate']} minimumDate={new Date()} />
      <SelectField
        label="Repeat"
        value={(f.intervalMonths || '0') as '0' | '6' | '12' | '24'}
        options={REPEATS}
        onChange={(v) => set('intervalMonths', v === '0' ? '' : v)}
      />
      <TextField label="Due at km (optional)" value={f.dueMileageKm} onChangeText={(v) => set('dueMileageKm', v)} keyboardType="number-pad" error={errors['dueMileageKm']} />
      <TextField label="Notes (optional)" value={f.notes} onChangeText={(v) => set('notes', v)} maxLength={1000} />
      <Muted>We’ll notify you 14 days before the due date.</Muted>
      <ErrorText>{add.isError ? 'Could not save the reminder. Try again.' : null}</ErrorText>
      <Button title="Save reminder" onPress={save} loading={add.isPending} />
    </Screen>
  );
}

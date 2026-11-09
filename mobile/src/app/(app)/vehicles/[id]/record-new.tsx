import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { SERVICE_RECORD_TYPES, serviceRecordSchema } from '@/shared/validation/vehicle-care';
import { isoDate, useAddServiceRecord } from '@/lib/vehicle-care';
import { DateField } from '@/components/date-field';
import { Button, ErrorText, Screen, SelectField, TextField } from '@/components/ui';

type RecordType = (typeof SERVICE_RECORD_TYPES)[number]['value'];

export default function NewServiceRecord() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const add = useAddServiceRecord(id);
  const [f, setF] = useState({
    eventType: '' as RecordType | '',
    eventDate: isoDate(new Date()),
    title: '', description: '', partsReplaced: '', mileageKm: '', costEur: '', garageName: '',
    warrantyUntil: '', nextDueDate: '', nextDueMileageKm: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));

  function save() {
    const parsed = serviceRecordSchema.safeParse(f);
    if (!parsed.success) {
      const e: Record<string, string> = {};
      for (const i of parsed.error.issues) e[i.path.join('.')] ??= i.path[0] === 'eventType' ? 'Choose a type' : i.message;
      return setErrors(e);
    }
    setErrors({});
    add.mutate(parsed.data, { onSuccess: () => router.back() });
  }

  return (
    <Screen edges={['bottom']}>
      <SelectField label="Type" value={f.eventType} options={SERVICE_RECORD_TYPES.map((t) => ({ value: t.value, label: t.label }))}
        onChange={(v) => set('eventType', v)} error={errors['eventType']} />
      <DateField label="Date" value={f.eventDate} onChange={(v) => set('eventDate', v)} error={errors['eventDate']} />
      <TextField label="Title (optional)" value={f.title} onChangeText={(v) => set('title', v)} maxLength={120} placeholder="e.g. 60,000 km service" />
      <TextField label="Garage (optional)" value={f.garageName} onChangeText={(v) => set('garageName', v)} maxLength={120} />
      <TextField label="Mileage in km (optional)" value={f.mileageKm} onChangeText={(v) => set('mileageKm', v)} keyboardType="number-pad" error={errors['mileageKm']} />
      <TextField label="Cost in € (optional)" value={f.costEur} onChangeText={(v) => set('costEur', v)} keyboardType="decimal-pad" error={errors['costEur']} />
      <TextField label="What was done (optional)" value={f.description} onChangeText={(v) => set('description', v)} multiline maxLength={2000}
        style={{ minHeight: 96, textAlignVertical: 'top' }} />
      <TextField label="Parts replaced (optional)" value={f.partsReplaced} onChangeText={(v) => set('partsReplaced', v)} maxLength={1000} />
      <DateField label="Warranty until (optional)" value={f.warrantyUntil} onChange={(v) => set('warrantyUntil', v)} optional error={errors['warrantyUntil']} />
      <DateField label="Next due (optional)" value={f.nextDueDate} onChange={(v) => set('nextDueDate', v)} optional error={errors['nextDueDate']} />
      <TextField label="Next due at km (optional)" value={f.nextDueMileageKm} onChangeText={(v) => set('nextDueMileageKm', v)} keyboardType="number-pad" error={errors['nextDueMileageKm']} />
      <ErrorText>{add.isError ? 'Could not save the record. Try again.' : null}</ErrorText>
      <Button title="Save record" onPress={save} loading={add.isPending} />
    </Screen>
  );
}

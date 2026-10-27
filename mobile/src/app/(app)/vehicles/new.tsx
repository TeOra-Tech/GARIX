import { useState } from 'react';
import { router } from 'expo-router';
import { vehicleSchema, FUEL_TYPES, TRANSMISSIONS } from '@/shared/validation/vehicle';
import { useCreateVehicle, useMakes, useModels, vehicleErrorMessage } from '@/lib/queries';
import { Button, ErrorText, Screen, SelectField, TextField } from '@/components/ui';

const OTHER = '__other__';
const FUEL_LABELS: Record<(typeof FUEL_TYPES)[number], string> = {
  petrol: 'Petrol', diesel: 'Diesel', hybrid: 'Hybrid', plugin_hybrid: 'Plug-in hybrid', electric: 'Electric', lpg: 'LPG', other: 'Other',
};
const TRANSMISSION_LABELS: Record<(typeof TRANSMISSIONS)[number], string> = {
  manual: 'Manual', automatic: 'Automatic', semi_automatic: 'Semi-automatic', cvt: 'CVT',
};

export default function NewVehicle() {
  const makes = useMakes();
  const [makeId, setMakeId] = useState('');
  const models = useModels(makeId && makeId !== OTHER ? makeId : null);
  const [modelId, setModelId] = useState('');
  const [f, setF] = useState({ registrationNumber: '', makeText: '', modelText: '', year: '', fuelType: '', transmission: '', mileageKm: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const create = useCreateVehicle();
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));

  function save() {
    const parsed = vehicleSchema.safeParse({
      registrationNumber: f.registrationNumber,
      makeId: makeId && makeId !== OTHER ? makeId : '',
      makeText: makeId === OTHER ? f.makeText : '',
      modelId: modelId && modelId !== OTHER ? modelId : '',
      modelText: modelId === OTHER || makeId === OTHER ? f.modelText : '',
      variant: '',
      year: f.year,
      engineId: '',
      engineSizeCustom: '',
      fuelType: f.fuelType,
      transmission: f.transmission,
      vin: '',
      mileageKm: f.mileageKm,
    });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join('.') || 'form';
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      return setErrors(fieldErrors);
    }
    setErrors({});
    create.mutate(parsed.data, { onSuccess: () => router.back() });
  }

  const makeOptions = [...(makes.data ?? []).map((m) => ({ value: m.id, label: m.name })), { value: OTHER, label: 'Other / not listed' }];
  const modelOptions = [...(models.data ?? []).map((m) => ({ value: m.id, label: m.name })), { value: OTHER, label: 'Other / not listed' }];

  return (
    <Screen edges={['bottom']}>
      <TextField label="Registration number" value={f.registrationNumber} onChangeText={(v) => set('registrationNumber', v)}
        autoCapitalize="characters" autoCorrect={false} placeholder="e.g. 191-D-12345" error={errors['registrationNumber']} />
      <SelectField label="Make" value={makeId} options={makeOptions} onChange={(v) => { setMakeId(v); setModelId(''); }} error={errors['makeId'] ?? errors['form']} />
      {makeId === OTHER && <TextField label="Make name" value={f.makeText} onChangeText={(v) => set('makeText', v)} error={errors['makeText']} />}
      {makeId && makeId !== OTHER && (
        <SelectField label="Model" value={modelId} options={modelOptions} onChange={setModelId} error={errors['modelId']} />
      )}
      {(makeId === OTHER || modelId === OTHER) && (
        <TextField label="Model name" value={f.modelText} onChangeText={(v) => set('modelText', v)} error={errors['modelText']} />
      )}
      <TextField label="Year (optional)" value={f.year} onChangeText={(v) => set('year', v)} keyboardType="number-pad" maxLength={4} error={errors['year']} />
      <SelectField label="Fuel (optional)" value={f.fuelType as (typeof FUEL_TYPES)[number] | ''}
        options={FUEL_TYPES.map((t) => ({ value: t, label: FUEL_LABELS[t] }))} onChange={(v) => set('fuelType', v)} />
      <SelectField label="Gearbox (optional)" value={f.transmission as (typeof TRANSMISSIONS)[number] | ''}
        options={TRANSMISSIONS.map((t) => ({ value: t, label: TRANSMISSION_LABELS[t] }))} onChange={(v) => set('transmission', v)} />
      <TextField label="Mileage in km (optional)" value={f.mileageKm} onChangeText={(v) => set('mileageKm', v)} keyboardType="number-pad" error={errors['mileageKm']} />
      <ErrorText>{create.isError ? vehicleErrorMessage(create.error) : null}</ErrorText>
      <Button title="Save vehicle" onPress={save} loading={create.isPending} />
    </Screen>
  );
}

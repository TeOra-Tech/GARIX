import { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { serviceRequestSchema, URGENCIES, URGENCY_LABELS, MAX_ATTACHMENTS, type ServiceRequestData } from '@/shared/validation/request';
import { IRISH_COUNTIES } from '@/shared/validation/auth';
import { formatEur } from '@/shared/vat';
import { useRepairCategories, useVehicles, vehicleName, type PickedPhoto } from '@/lib/queries';
import { Body, Button, Card, Checkbox, ChoiceList, ErrorText, H2, Muted, SelectField, TextField } from '@/components/ui';
import { colors, fonts } from '@/lib/theme';

export type RequestFormValues = {
  vehicleId: string;
  serviceCategoryId: string;
  problemCategoryId: string;
  title: string;
  description: string;
  urgency: string;
  locationTown: string;
  locationCounty: string;
  collectionRequired: boolean;
  budgetAmount: string;
  /** Set on the web; the app has no date picker yet, so it is carried through unchanged. */
  expectedCompletionDate: string;
};

export const EMPTY_REQUEST: RequestFormValues = {
  vehicleId: '', serviceCategoryId: '', problemCategoryId: '', title: '', description: '',
  urgency: 'flexible', locationTown: '', locationCounty: '', collectionRequired: false, budgetAmount: '',
  expectedCompletionDate: '',
};

const STEPS = ['Vehicle', 'The problem', 'When and where', 'Review'] as const;

/** Town → coordinates via OpenStreetMap, so garages can match by distance (best effort). */
async function geocode(town: string, county: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const q = new URLSearchParams({ q: `${town}, Co. ${county}, Ireland`, format: 'jsonv2', countrycodes: 'ie', limit: '1' });
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${q}`, {
      headers: { Accept: 'application/json', 'User-Agent': 'GarixApp/1.0 (support@garix.ie)' },
    });
    const [hit] = (await res.json()) as { lat: string; lon: string }[];
    return hit ? { lat: Number(hit.lat), lng: Number(hit.lon) } : null;
  } catch {
    return null;
  }
}

export function RequestForm({
  initial,
  allowPhotos,
  submitLabel,
  pending,
  submitError,
  onSubmit,
}: {
  initial: RequestFormValues;
  allowPhotos: boolean;
  submitLabel: string;
  pending: boolean;
  submitError: string | null;
  onSubmit: (data: ServiceRequestData, photos: PickedPhoto[]) => void;
}) {
  const vehicles = useVehicles();
  const categories = useRepairCategories();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initial);
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [locating, setLocating] = useState(false);
  const set = <K extends keyof RequestFormValues>(k: K, v: RequestFormValues[K]) => setForm((f) => ({ ...f, [k]: v }));

  const STEP_FIELDS: (keyof RequestFormValues)[][] = [
    ['vehicleId'],
    ['serviceCategoryId', 'title', 'description'],
    ['urgency', 'locationTown', 'locationCounty', 'budgetAmount'],
  ];

  function validate(fields: (keyof RequestFormValues)[]): boolean {
    const shape = Object.fromEntries(fields.map((f) => [f, true]));
    const parsed = serviceRequestSchema.pick(shape as never).safeParse(Object.fromEntries(fields.map((f) => [f, form[f]])));
    if (parsed.success) {
      setErrors({});
      return true;
    }
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.');
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    setErrors(fieldErrors);
    return false;
  }

  async function addPhotos() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_ATTACHMENTS - photos.length,
      quality: 0.7,
    });
    if (result.canceled) return;
    const picked = result.assets.map((a, i) => ({
      uri: a.uri,
      mimeType: a.mimeType ?? 'image/jpeg',
      fileName: a.fileName ?? `photo-${Date.now()}-${i}.jpg`,
    }));
    setPhotos((p) => [...p, ...picked].slice(0, MAX_ATTACHMENTS));
  }

  async function submit() {
    setLocating(true);
    const coords = await geocode(form.locationTown, form.locationCounty);
    setLocating(false);
    const parsed = serviceRequestSchema.safeParse({
      ...form,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
      // A date already in the past would fail validation; drop it rather than block the save.
      expectedCompletionDate: form.expectedCompletionDate >= new Date().toISOString().slice(0, 10) ? form.expectedCompletionDate : '',
    });
    if (!parsed.success) {
      setStep(0);
      setErrors({ form: 'Something is missing — go through the steps again.' });
      return;
    }
    onSubmit(parsed.data, photos);
  }

  const problemOptions = form.serviceCategoryId ? categories.data?.childrenByParent.get(form.serviceCategoryId) ?? [] : [];
  const vehicle = vehicles.data?.find((v) => v.id === form.vehicleId);
  const category = categories.data?.parents.find((c) => c.id === form.serviceCategoryId);

  return (
    <View style={{ gap: 16 }}>
      <Muted accessibilityRole="text">
        Step {step + 1} of {STEPS.length}: {STEPS[step]}
      </Muted>
      <ErrorText>{errors['form']}</ErrorText>

      {step === 0 && (
        <>
          <H2>Which vehicle is it?</H2>
          {vehicles.data?.length === 0 ? (
            <Muted>Add a vehicle first from the Vehicles tab.</Muted>
          ) : (
            <ChoiceList
              label="Vehicle"
              value={form.vehicleId}
              onChange={(v) => set('vehicleId', v)}
              options={(vehicles.data ?? []).map((v) => ({ value: v.id, label: vehicleName(v) || 'Vehicle', hint: v.registration_number }))}
            />
          )}
          <ErrorText>{errors['vehicleId']}</ErrorText>
        </>
      )}

      {step === 1 && (
        <>
          <H2>What’s the problem?</H2>
          <SelectField label="Category" value={form.serviceCategoryId}
            options={(categories.data?.parents ?? []).map((c) => ({ value: c.id, label: c.name }))}
            onChange={(v) => setForm((f) => ({ ...f, serviceCategoryId: v, problemCategoryId: '' }))} error={errors['serviceCategoryId']} />
          {problemOptions.length > 0 && (
            <SelectField label="Specific problem (optional)" value={form.problemCategoryId} placeholder="Not sure / other"
              options={problemOptions.map((c) => ({ value: c.id, label: c.name }))}
              onChange={(v) => set('problemCategoryId', v)} />
          )}
          <TextField label="Title" value={form.title} onChangeText={(v) => set('title', v)} maxLength={120}
            placeholder="e.g. Grinding noise when braking" error={errors['title']} />
          <TextField label="Description" value={form.description} onChangeText={(v) => set('description', v)} maxLength={2000}
            multiline numberOfLines={5} style={{ minHeight: 120, textAlignVertical: 'top' }}
            placeholder="When did it start? Any warning lights? What have you tried?" error={errors['description']} />
          {allowPhotos && (
            <View style={{ gap: 8 }}>
              <Body style={{ fontFamily: fonts.medium }}>Photos (optional, up to {MAX_ATTACHMENTS})</Body>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {photos.map((p, i) => (
                  <Pressable key={p.uri} accessibilityRole="button" accessibilityLabel={`Remove photo ${i + 1}`}
                    onPress={() => setPhotos((all) => all.filter((_, j) => j !== i))}>
                    <Image source={{ uri: p.uri }} style={{ width: 76, height: 76, borderRadius: 10 }} />
                    <Text style={{ position: 'absolute', top: 2, right: 6, color: colors.white, fontFamily: fonts.bold }}>✕</Text>
                  </Pressable>
                ))}
              </View>
              {photos.length < MAX_ATTACHMENTS && <Button title="Add photos" variant="secondary" onPress={addPhotos} />}
            </View>
          )}
        </>
      )}

      {step === 2 && (
        <>
          <H2>When and where?</H2>
          <ChoiceList label="How urgent is it?" value={form.urgency as (typeof URGENCIES)[number]} onChange={(v) => set('urgency', v)}
            options={URGENCIES.map((u) => ({ value: u, label: URGENCY_LABELS[u] }))} />
          <TextField label="Town or city" value={form.locationTown} onChangeText={(v) => set('locationTown', v)} error={errors['locationTown']} />
          <SelectField label="County" value={form.locationCounty} onChange={(v) => set('locationCounty', v)}
            options={IRISH_COUNTIES.map((c) => ({ value: c, label: c }))} error={errors['locationCounty']} />
          <Checkbox label="I need the garage to collect the vehicle" checked={form.collectionRequired} onChange={(v) => set('collectionRequired', v)} />
          <TextField label="Budget in € (optional)" value={form.budgetAmount} onChangeText={(v) => set('budgetAmount', v)} keyboardType="decimal-pad" error={errors['budgetAmount']} />
        </>
      )}

      {step === 3 && (
        <>
          <H2>Check and post</H2>
          <Card>
            {[
              ['Vehicle', vehicle ? `${vehicleName(vehicle)} (${vehicle.registration_number})` : '—'],
              ['Category', category?.name ?? '—'],
              ['Title', form.title],
              ['Description', form.description],
              ['Photos', allowPhotos ? String(photos.length) : null],
              ['Urgency', URGENCY_LABELS[form.urgency as (typeof URGENCIES)[number]]],
              ['Location', `${form.locationTown}, Co. ${form.locationCounty}`],
              ['Collection', form.collectionRequired ? 'Yes' : 'No'],
              ['Budget', form.budgetAmount ? formatEur(Number(form.budgetAmount)) : 'Not set'],
            ]
              .filter(([, v]) => v !== null)
              .map(([k, v]) => (
                <View key={k} style={{ gap: 2, paddingVertical: 4 }}>
                  <Muted>{k}</Muted>
                  <Body>{v}</Body>
                </View>
              ))}
          </Card>
          <ErrorText>{submitError}</ErrorText>
        </>
      )}

      <View style={{ flexDirection: 'row', gap: 12 }}>
        {step > 0 && <Button title="Back" variant="secondary" style={{ flex: 1 }} onPress={() => setStep((s) => s - 1)} />}
        {step < STEPS.length - 1 ? (
          <Button title="Continue" style={{ flex: 1 }} onPress={() => validate(STEP_FIELDS[step]) && setStep((s) => s + 1)} />
        ) : (
          <Button title={submitLabel} style={{ flex: 1 }} loading={pending || locating} onPress={submit} />
        )}
      </View>
    </View>
  );
}

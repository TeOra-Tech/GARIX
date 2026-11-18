import { useState } from 'react';
import { Alert, View } from 'react-native';
import { useAuth } from '@/lib/auth';
import { useRepairCategories } from '@/lib/queries';
import { DEFAULT_OPENING_HOURS, geocodeAddress, useRegisterGarage } from '@/lib/garage-register';
import { registerGarageSchema } from '@/shared/validation/garage';
import { IRISH_COUNTIES } from '@/shared/validation/auth';
import { Body, Button, Card, Checkbox, ErrorText, H1, H2, Loading, Muted, Screen, SelectField, TextField } from '@/components/ui';
import { space } from '@/lib/theme';

type Form = {
  name: string; contactPerson: string; phone: string; email: string; website: string; description: string;
  yearsInBusiness: string; serviceRadiusKm: string; isEvSpecialist: boolean; offersCollection: boolean;
  line1: string; line2: string; town: string; county: string; eircode: string; serviceCategoryIds: string[];
};

/** Free garage registration (same fields as garix.ie/garages/register, opening hours set later). */
export default function GarageRegister() {
  const { profile, refreshProfile } = useAuth();
  const categories = useRepairCategories();
  const register = useRegisterGarage();
  const [f, setF] = useState<Form>({
    name: '', contactPerson: profile?.full_name ?? '', phone: profile?.mobile_number ?? '', email: profile?.email ?? '',
    website: '', description: '', yearsInBusiness: '', serviceRadiusKm: '20', isEvSpecialist: false, offersCollection: false,
    line1: '', line2: '', town: '', county: '', eircode: '', serviceCategoryIds: [],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((s) => ({ ...s, [k]: v }));
  const toggleService = (id: string) =>
    set('serviceCategoryIds', f.serviceCategoryIds.includes(id) ? f.serviceCategoryIds.filter((s) => s !== id) : [...f.serviceCategoryIds, id]);

  async function submit() {
    setFormError(null);
    const input = {
      name: f.name, contactPerson: f.contactPerson, phone: f.phone, email: f.email, website: f.website,
      description: f.description, yearsInBusiness: f.yearsInBusiness, serviceRadiusKm: f.serviceRadiusKm,
      isEvSpecialist: f.isEvSpecialist, offersCollection: f.offersCollection, openingHours: DEFAULT_OPENING_HOURS,
      address: { line1: f.line1, line2: f.line2, town: f.town, county: f.county, eircode: f.eircode },
      lat: 53.35, lng: -6.26, // placeholder so the other fields validate first
      serviceCategoryIds: f.serviceCategoryIds,
    };
    const first = registerGarageSchema.safeParse(input);
    if (!first.success) {
      const e: Record<string, string> = {};
      for (const i of first.error.issues) e[i.path.join('.')] ??= i.message;
      setErrors(e);
      return setFormError('Check the highlighted fields.');
    }
    setErrors({});
    setLocating(true);
    const point = await geocodeAddress({ line1: f.line1, town: f.town, county: f.county, eircode: f.eircode });
    setLocating(false);
    if (!point) return setFormError('We couldn’t find that address on the map. Check the town and county, then try again.');
    const parsed = registerGarageSchema.safeParse({ ...input, ...point });
    if (!parsed.success) return setFormError('We couldn’t place that address in Ireland. Check it and try again.');

    register.mutate(parsed.data, {
      onSuccess: async () => {
        Alert.alert(
          'Garage registered',
          'Thanks! Our team will verify your details, usually within 2 working days. You can set your opening hours, photos and certifications on garix.ie.',
        );
        // The garage owner role switches the app to the garage side (root navigator).
        await refreshProfile();
      },
      onError: () => setFormError('Could not register the garage. Check the form and try again.'),
    });
  }

  return (
    <Screen edges={['bottom']}>
      <View style={{ gap: 6 }}>
        <H1>Register your garage</H1>
        <Body>Free to register. Once we’ve verified your details, repair requests near you appear in your feed and you quote for the jobs you want.</Body>
      </View>

      <H2>Business</H2>
      <TextField label="Garage name" value={f.name} onChangeText={(v) => set('name', v)} maxLength={120} error={errors['name']} />
      <TextField label="Contact person" value={f.contactPerson} onChangeText={(v) => set('contactPerson', v)} autoComplete="name" maxLength={120} error={errors['contactPerson']} />
      <TextField label="Phone" value={f.phone} onChangeText={(v) => set('phone', v)} keyboardType="phone-pad" autoComplete="tel" placeholder="041 123 4567" error={errors['phone']} />
      <TextField label="Business email (optional)" value={f.email} onChangeText={(v) => set('email', v)} autoCapitalize="none" keyboardType="email-address" error={errors['email']} />
      <TextField label="Website (optional)" value={f.website} onChangeText={(v) => set('website', v)} autoCapitalize="none" keyboardType="url" placeholder="https://" error={errors['website']} />
      <TextField label="Years in business (optional)" value={f.yearsInBusiness} onChangeText={(v) => set('yearsInBusiness', v)} keyboardType="number-pad" error={errors['yearsInBusiness']} />
      <TextField label="About your garage (optional)" value={f.description} onChangeText={(v) => set('description', v)} multiline maxLength={2000}
        style={{ minHeight: 96, textAlignVertical: 'top' }} error={errors['description']} />

      <H2>Address</H2>
      <TextField label="Address line 1" value={f.line1} onChangeText={(v) => set('line1', v)} autoComplete="street-address" error={errors['address.line1']} />
      <TextField label="Address line 2 (optional)" value={f.line2} onChangeText={(v) => set('line2', v)} />
      <TextField label="Town or city" value={f.town} onChangeText={(v) => set('town', v)} error={errors['address.town']} />
      <SelectField label="County" value={f.county} onChange={(v) => set('county', v)}
        options={IRISH_COUNTIES.map((c) => ({ value: c, label: c }))} error={errors['address.county']} />
      <TextField label="Eircode (optional)" value={f.eircode} onChangeText={(v) => set('eircode', v)} autoCapitalize="characters" autoComplete="postal-code" error={errors['address.eircode']} />
      <Muted>We place your garage on the map from this address, so customers nearby can find you.</Muted>

      <H2>Jobs you take on</H2>
      <TextField label="How far will you travel or accept jobs from? (km)" value={f.serviceRadiusKm} onChangeText={(v) => set('serviceRadiusKm', v)}
        keyboardType="number-pad" error={errors['serviceRadiusKm']} />
      <Checkbox label="We specialise in electric and hybrid vehicles" checked={f.isEvSpecialist} onChange={(v) => set('isEvSpecialist', v)} />
      <Checkbox label="We offer vehicle collection" checked={f.offersCollection} onChange={(v) => set('offersCollection', v)} />

      <Card>
        <H2>Services you offer</H2>
        <ErrorText>{errors['serviceCategoryIds']}</ErrorText>
        {categories.isPending ? <Loading /> : null}
        <View style={{ gap: space.xs }}>
          {categories.data?.parents.map((c) => (
            <Checkbox key={c.id} label={c.name} checked={f.serviceCategoryIds.includes(c.id)} onChange={() => toggleService(c.id)} />
          ))}
        </View>
      </Card>

      <ErrorText>{formError}</ErrorText>
      <Button title="Register garage — free" onPress={submit} loading={locating || register.isPending} />
    </Screen>
  );
}

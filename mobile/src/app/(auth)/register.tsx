import { useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { registerSchema, otpSchema, IRISH_COUNTIES, type RegisterData } from '@/shared/validation/auth';
import { supabase } from '@/lib/supabase';
import { Body, Button, Checkbox, ChoiceList, ErrorText, H2, Muted, Screen, SelectField, TextField } from '@/components/ui';
import { colors, fonts } from '@/lib/theme';

type Form = {
  fullName: string; email: string; mobile: string;
  line1: string; line2: string; town: string; county: string; eircode: string;
  termsAccepted: boolean; marketingOptIn: boolean;
};
const EMPTY: Form = { fullName: '', email: '', mobile: '', line1: '', line2: '', town: '', county: '', eircode: '', termsAccepted: false, marketingOptIn: false };

/** Mirrors garix.ie/auth/register: details → email code → profile + address saved. */
export default function Register() {
  const [accountType, setAccountType] = useState<'individual' | 'fleet'>('individual');
  const [form, setForm] = useState<Form>(EMPTY);
  const [validated, setValidated] = useState<RegisterData | null>(null);
  const [code, setCode] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const isFleet = accountType === 'fleet';

  async function submitDetails() {
    setFormError(null);
    const parsed = registerSchema.safeParse({
      fullName: form.fullName,
      email: form.email,
      mobile: form.mobile,
      address: { line1: form.line1, line2: form.line2, town: form.town, county: form.county, eircode: form.eircode },
      termsAccepted: form.termsAccepted,
      marketingOptIn: form.marketingOptIn,
    });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join('.');
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      setFormError('Check the highlighted fields.');
      return;
    }
    setErrors({});
    setPending(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: parsed.data.email,
      options: {
        shouldCreateUser: true,
        data: { full_name: parsed.data.fullName, role: 'customer', ...(isFleet ? { account_type: 'fleet' } : {}) },
      },
    });
    setPending(false);
    if (error) return setFormError('Could not send the verification code. Wait a moment and try again.');
    setValidated(parsed.data);
  }

  async function verifyAndSave() {
    setFormError(null);
    const parsedCode = otpSchema.safeParse(code);
    if (!parsedCode.success) return setFormError(parsedCode.error.issues[0].message);
    if (!validated) return;
    setPending(true);
    const { data, error } = await supabase.auth.verifyOtp({ email: validated.email, token: parsedCode.data, type: 'email' });
    if (error || !data.user) {
      setPending(false);
      return setFormError('That code is wrong or has expired. Request a new one.');
    }
    // The profile row comes from the handle_new_user trigger; add what the form collected.
    await Promise.all([
      supabase.from('user_profiles').update({
        full_name: validated.fullName,
        mobile_number: validated.mobile,
        marketing_opt_in: validated.marketingOptIn,
        terms_accepted_at: new Date().toISOString(),
        email_verified: true,
      }).eq('id', data.user.id),
      supabase.from('user_addresses').insert({
        user_id: data.user.id,
        line1: validated.address.line1,
        line2: validated.address.line2 || null,
        town: validated.address.town,
        county: validated.address.county,
        eircode: validated.address.eircode || null,
        is_default: true,
      }),
    ]);
    setPending(false);
    // Signed in: the root navigator switches to the app.
  }

  if (validated) {
    return (
      <Screen edges={['bottom']}>
        <H2>Check your email</H2>
        <Body>We sent a code to {validated.email}. Enter it to finish creating your account.</Body>
        <TextField label="Code from your email" value={code} onChangeText={setCode} keyboardType="number-pad"
          autoComplete="one-time-code" textContentType="oneTimeCode" maxLength={10} onSubmitEditing={verifyAndSave} />
        <ErrorText>{formError}</ErrorText>
        <Button title="Create account" onPress={verifyAndSave} loading={pending} />
        <Button title="Change my details" variant="secondary" onPress={() => { setValidated(null); setCode(''); }} />
      </Screen>
    );
  }

  return (
    <Screen edges={['bottom']}>
      <ChoiceList
        label="Account type"
        value={accountType}
        onChange={setAccountType}
        options={[
          { value: 'individual', label: 'Personal', hint: 'Up to 3 vehicles, free' },
          { value: 'fleet', label: 'Business (fleet)', hint: 'Unlimited vehicles, €5 per vehicle a month' },
        ]}
      />
      <TextField label="Full name" value={form.fullName} onChangeText={(v) => set('fullName', v)} autoComplete="name" textContentType="name" error={errors['fullName']} />
      <TextField label="Email" value={form.email} onChangeText={(v) => set('email', v)} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" error={errors['email']} />
      <TextField label="Mobile number" value={form.mobile} onChangeText={(v) => set('mobile', v)} keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" placeholder="087 123 4567" error={errors['mobile']} />
      <H2>Address</H2>
      <TextField label="Address line 1" value={form.line1} onChangeText={(v) => set('line1', v)} autoComplete="street-address" error={errors['address.line1']} />
      <TextField label="Address line 2 (optional)" value={form.line2} onChangeText={(v) => set('line2', v)} />
      <TextField label="Town or city" value={form.town} onChangeText={(v) => set('town', v)} error={errors['address.town']} />
      <SelectField label="County" value={form.county} onChange={(v) => set('county', v)}
        options={IRISH_COUNTIES.map((c) => ({ value: c, label: c }))} error={errors['address.county']} />
      <TextField label="Eircode (optional)" value={form.eircode} onChangeText={(v) => set('eircode', v)} autoCapitalize="characters" autoComplete="postal-code" error={errors['address.eircode']} />
      <Checkbox label="I accept the terms of service and privacy policy" checked={form.termsAccepted} onChange={(v) => set('termsAccepted', v)}>
        <Text style={{ fontFamily: fonts.regular, fontSize: 15, color: colors.charcoal, lineHeight: 22 }}>
          I accept the{' '}
          <Text accessibilityRole="link" style={{ color: colors.navy, textDecorationLine: 'underline' }} onPress={() => Linking.openURL('https://garix.ie/legal/terms')}>terms of service</Text>
          {' '}and{' '}
          <Text accessibilityRole="link" style={{ color: colors.navy, textDecorationLine: 'underline' }} onPress={() => Linking.openURL('https://garix.ie/legal/privacy')}>privacy policy</Text>
        </Text>
      </Checkbox>
      <ErrorText>{errors['termsAccepted']}</ErrorText>
      <Checkbox label="Send me Garix news and offers (optional)" checked={form.marketingOptIn} onChange={(v) => set('marketingOptIn', v)} />
      {isFleet && <Muted>You’ll set up business billing after creating your account.</Muted>}
      <ErrorText>{formError}</ErrorText>
      <View style={{ marginTop: 4 }}>
        <Button title="Send verification code" onPress={submitDetails} loading={pending} />
      </View>
    </Screen>
  );
}

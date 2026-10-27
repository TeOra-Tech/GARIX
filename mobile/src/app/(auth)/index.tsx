import { useState } from 'react';
import { Image, View } from 'react-native';
import { Link } from 'expo-router';
import { emailSchema, otpSchema } from '@/shared/validation/auth';
import { supabase } from '@/lib/supabase';
import { Body, Button, ErrorText, H1, Muted, Screen, TextField } from '@/components/ui';
import { colors, fonts } from '@/lib/theme';

/** Email one-time-code sign-in — the same flow as garix.ie/auth/login. */
export default function SignIn() {
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function sendCode() {
    setError(null);
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) return setError(parsed.error.issues[0].message);
    setPending(true);
    const { error: err } = await supabase.auth.signInWithOtp({ email: parsed.data, options: { shouldCreateUser: false } });
    setPending(false);
    if (err) return setError('We couldn’t find an account with that email, or sent too many codes. Check it, or create an account.');
    setEmail(parsed.data);
    setStep('code');
  }

  async function verify() {
    setError(null);
    const parsed = otpSchema.safeParse(code);
    if (!parsed.success) return setError(parsed.error.issues[0].message);
    setPending(true);
    const { error: err } = await supabase.auth.verifyOtp({ email, token: parsed.data, type: 'email' });
    setPending(false);
    // On success the auth listener swaps the navigator to the signed-in screens.
    if (err) setError('That code is wrong or has expired. Request a new one.');
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={{ alignItems: 'center', marginTop: 24, marginBottom: 8 }}>
        <Image source={require('../../../assets/logo-horizontal.png')} style={{ width: 200, height: 50 }} resizeMode="contain" accessibilityLabel="Garix" />
      </View>
      <H1>Log in</H1>
      {step === 'email' ? (
        <>
          <Body>Enter your email and we’ll send you a sign-in code.</Body>
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            returnKeyType="send"
            onSubmitEditing={sendCode}
          />
          <ErrorText>{error}</ErrorText>
          <Button title="Send code" onPress={sendCode} loading={pending} />
          <View style={{ alignItems: 'center', gap: 4, marginTop: 8 }}>
            <Muted>New to Garix?</Muted>
            <Link href="/register" style={{ fontFamily: fonts.semibold, color: colors.navy, fontSize: 15, padding: 8 }}>
              Create an account
            </Link>
          </View>
        </>
      ) : (
        <>
          <Body>We sent a code to {email}. It expires in a few minutes.</Body>
          <TextField
            label="Code from your email"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            maxLength={10}
            returnKeyType="done"
            onSubmitEditing={verify}
          />
          <ErrorText>{error}</ErrorText>
          <Button title="Log in" onPress={verify} loading={pending} />
          <Button title="Use a different email" variant="secondary" onPress={() => { setStep('email'); setCode(''); setError(null); }} />
        </>
      )}
    </Screen>
  );
}

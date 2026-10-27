import { useState } from 'react';
import { Alert, Linking, Text, View } from 'react-native';
import { router } from 'expo-router';
import { z } from 'zod';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useDeleteAccount, useDeletionBlockers, useUpdateProfile } from '@/lib/queries';
import { BLOCKER_COPY, isDeletionBlocker } from '@/shared/deletion';
import { Body, Button, Card, ErrorText, H2, Loading, Muted, Screen, TextField } from '@/components/ui';
import { colors, fonts } from '@/lib/theme';

const profileSchema = z.object({
  fullName: z.string().trim().min(2, 'Your full name is required').max(120),
  mobileNumber: z.string().trim().regex(/^(\+?[0-9 -]{7,16})?$/, 'Enter a valid mobile number'),
});

export default function Account() {
  const { profile } = useAuth();
  const update = useUpdateProfile();
  // The signed-in navigator only mounts once the profile has loaded.
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [mobile, setMobile] = useState(profile?.mobile_number ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [deleting, setDeleting] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');
  const blockers = useDeletionBlockers(deleting);
  const remove = useDeleteAccount();

  function save() {
    setSaved(false);
    const parsed = profileSchema.safeParse({ fullName, mobileNumber: mobile });
    if (!parsed.success) return setError(parsed.error.issues[0].message);
    setError(null);
    update.mutate(
      { fullName: parsed.data.fullName, mobileNumber: parsed.data.mobileNumber || null },
      { onSuccess: () => setSaved(true) },
    );
  }

  const serverBlockers = (remove.error as unknown as { blockers?: string[] } | null)?.blockers ?? [];
  const activeBlockers = (serverBlockers.length ? serverBlockers : blockers.data ?? []).filter(isDeletionBlocker);
  const emailMatches = !!profile && confirmEmail.trim().toLowerCase() === profile.email.toLowerCase();

  function confirmDelete() {
    Alert.alert('Delete your account?', 'This permanently deletes your Garix account. It can’t be undone.', [
      { text: 'Keep my account', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => remove.mutate(confirmEmail) },
    ]);
  }

  return (
    <Screen edges={[]}>
      <Card>
        <H2>Your details</H2>
        <TextField label="Full name" value={fullName} onChangeText={setFullName} autoComplete="name" />
        <TextField label="Mobile number" value={mobile} onChangeText={setMobile} keyboardType="phone-pad" autoComplete="tel" />
        <TextField label="Email" value={profile?.email ?? ''} editable={false} style={{ color: colors.muted }} />
        <Muted>Your email is how you sign in, so it can’t be changed here. Contact support@garix.ie if it needs updating.</Muted>
        <ErrorText>{error ?? (update.isError ? 'Could not save your details. Try again.' : null)}</ErrorText>
        {saved && <Text accessibilityRole="alert" style={{ fontFamily: fonts.medium, color: colors.success }}>Saved.</Text>}
        <Button title="Save changes" onPress={save} loading={update.isPending} />
      </Card>

      {profile?.account_type === 'fleet' && (
        <Card>
          <H2>Garix for business</H2>
          <Muted>Manage your business billing on garix.ie.</Muted>
          <Button title="Open billing" variant="secondary" onPress={() => Linking.openURL('https://garix.ie/dashboard/billing')} />
        </Card>
      )}

      <Card>
        <H2>Help and legal</H2>
        {[
          ['Privacy policy', 'https://garix.ie/legal/privacy'],
          ['Terms of service', 'https://garix.ie/legal/terms'],
          ['Contact support', 'mailto:support@garix.ie'],
        ].map(([label, url]) => (
          <Text key={label} accessibilityRole="link" onPress={() => Linking.openURL(url)} style={{ fontFamily: fonts.medium, color: colors.navy, paddingVertical: 8, fontSize: 15 }}>
            {label}
          </Text>
        ))}
      </Card>

      <Button title="Sign out" variant="secondary" onPress={() => supabase.auth.signOut()} />

      <Card style={{ borderColor: '#F3B4B4' }}>
        <H2>Delete account</H2>
        <Body>Permanently delete your Garix account and the personal data linked to it.</Body>
        {!deleting ? (
          <Button title="Delete my account" variant="dangerOutline" onPress={() => setDeleting(true)} />
        ) : (
          <View style={{ gap: 12 }}>
            <Muted>
              We delete your profile, vehicles, service history, repair requests, photos, messages and reviews. We keep records the
              law requires, such as payment and tax records for 6 years, with your name removed where possible.
            </Muted>
            {blockers.isPending && <Loading label="Checking your account…" />}
            {activeBlockers.length > 0 ? (
              <View accessibilityRole="alert" style={{ gap: 8, padding: 12, borderRadius: 12, backgroundColor: '#FEF3C7' }}>
                <Body style={{ fontFamily: fonts.semibold }}>Before you can delete your account</Body>
                {activeBlockers.map((b) => (
                  <View key={b} style={{ gap: 4 }}>
                    <Body>{BLOCKER_COPY[b].text}</Body>
                    {b === 'active_job' && <Button title="Go to your requests" variant="secondary" onPress={() => router.navigate('/requests')} />}
                    {b === 'active_billing' && <Button title="Open billing" variant="secondary" onPress={() => Linking.openURL('https://garix.ie/dashboard/billing')} />}
                  </View>
                ))}
              </View>
            ) : (
              blockers.isSuccess && (
                <>
                  <TextField label={`Type your email (${profile?.email}) to confirm`} value={confirmEmail} onChangeText={setConfirmEmail}
                    autoCapitalize="none" keyboardType="email-address" autoCorrect={false} />
                  <ErrorText>
                    {remove.isError && serverBlockers.length === 0
                      ? 'We couldn’t delete your account. Try again, or email privacy@garix.ie.'
                      : null}
                  </ErrorText>
                  <Button title="Permanently delete account" variant="danger" disabled={!emailMatches} loading={remove.isPending} onPress={confirmDelete} />
                  <Button title="Cancel" variant="secondary" onPress={() => { setDeleting(false); setConfirmEmail(''); }} />
                </>
              )
            )}
          </View>
        )}
      </Card>
    </Screen>
  );
}

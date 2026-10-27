import { Linking } from 'react-native';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Body, Button, H1, Muted, Screen } from '@/components/ui';

/** Garage owners and admins: their tools come to the app in a later release. */
export default function OtherRoles() {
  const { profile } = useAuth();
  const isGarage = profile?.role === 'garage_owner';
  return (
    <Screen edges={['top', 'bottom']}>
      <H1>{isGarage ? 'Garage tools are coming soon' : 'Use the admin console'}</H1>
      <Body>
        {isGarage
          ? 'Quoting, jobs, your wallet and your Pro tools aren’t in the app yet. Keep using garix.ie for now — we’ll let you know when they arrive here.'
          : 'The Garix admin console is only available on the web.'}
      </Body>
      <Button title="Open garix.ie" onPress={() => Linking.openURL(isGarage ? 'https://garix.ie/dashboard' : 'https://garix.ie/admin')} />
      <Button title="Sign out" variant="secondary" onPress={() => supabase.auth.signOut()} />
      {profile?.email ? <Muted>Signed in as {profile.email}</Muted> : null}
    </Screen>
  );
}

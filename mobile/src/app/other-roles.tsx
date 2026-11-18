import { Linking } from 'react-native';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Body, Button, H1, Muted, Screen } from '@/components/ui';

/** Admins, and garage owners on an iPhone that can't use the EU purchase link (see _layout). */
export default function OtherRoles() {
  const { profile } = useAuth();
  const isGarage = profile?.role === 'garage_owner';
  return (
    <Screen edges={['top', 'bottom']}>
      <H1>{isGarage ? 'Garage tools aren’t available on this iPhone' : 'Use the admin console'}</H1>
      <Body>
        {isGarage
          ? 'Quoting, jobs and messages need the latest version of iOS and an App Store account in Ireland. Update your iPhone, or keep using garix.ie.'
          : 'The Garix admin console is only available on the web.'}
      </Body>
      <Button title="Open garix.ie" onPress={() => Linking.openURL(isGarage ? 'https://garix.ie/dashboard' : 'https://garix.ie/admin')} />
      <Button title="Sign out" variant="secondary" onPress={() => supabase.auth.signOut()} />
      {profile?.email ? <Muted>Signed in as {profile.email}</Muted> : null}
    </Screen>
  );
}

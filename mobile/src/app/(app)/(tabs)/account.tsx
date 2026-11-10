import { Linking } from 'react-native';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Button, Card, H2, Muted, Screen } from '@/components/ui';
import { NotificationSettings } from '@/components/notification-settings';
import { DeleteAccountCard, HelpLinks, ProfileCard, SHOW_WEB_BILLING } from '@/components/account-sections';

export default function Account() {
  const { profile } = useAuth();

  return (
    <Screen edges={[]}>
      <ProfileCard />

      {profile?.account_type === 'fleet' && (
        <Card>
          <H2>Garix for business</H2>
          {SHOW_WEB_BILLING ? (
            <>
              <Muted>Manage your business billing on garix.ie.</Muted>
              <Button title="Open billing" variant="secondary" onPress={() => Linking.openURL('https://garix.ie/dashboard/billing')} />
            </>
          ) : (
            <Muted>Your account has no vehicle limit.</Muted>
          )}
        </Card>
      )}

      <NotificationSettings />
      <HelpLinks />
      <Button title="Sign out" variant="secondary" onPress={() => supabase.auth.signOut()} />
      <DeleteAccountCard jobsRoute="/requests" />
    </Screen>
  );
}

import { useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { useGarage } from '@/lib/garage-context';
import { LEDGER_LABELS, isProSubscription, useCreditLedger, useGarageSubscription, usePlansEnabled, useWallet } from '@/lib/garage';
import { supabase } from '@/lib/supabase';
import { Body, Button, Card, H2, Loading, Muted, Screen } from '@/components/ui';
import { NotificationSettings } from '@/components/notification-settings';
import { DeleteAccountCard, HelpLinks, ProfileCard } from '@/components/account-sections';
import { BuyButton } from '@/components/buy-button';
import { colors, fonts } from '@/lib/theme';

const STATUS_LABEL: Record<string, string> = {
  active: 'Verified',
  pending_verification: 'Waiting for verification',
  pending_approval: 'Waiting for approval',
  suspended: 'Suspended',
  rejected: 'Not approved',
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <Muted>{label}</Muted>
      <Body style={{ fontFamily: fonts.semibold, flexShrink: 1, textAlign: 'right' }}>{value}</Body>
    </View>
  );
}

export default function GarageAccount() {
  const { garage } = useGarage();
  const wallet = useWallet(garage?.id);
  const plansEnabled = usePlansEnabled().data ?? false;
  const sub = useGarageSubscription(garage?.id);
  const isPro = plansEnabled && isProSubscription(sub.data);
  const [showLedger, setShowLedger] = useState(false);
  const ledger = useCreditLedger(showLedger ? garage?.id : undefined);

  return (
    <Screen edges={[]}>
      {garage && (
        <Card>
          <H2>{garage.name}</H2>
          <Row label="Status" value={STATUS_LABEL[garage.status] ?? garage.status} />
          {plansEnabled && <Row label="Plan" value={isPro ? 'Garix Pro' : 'Basic'} />}
          {plansEnabled && !isPro && garage.status === 'active' && (
            <BuyButton garageId={garage.id} product="pro" title="Upgrade to Garix Pro" variant="secondary" />
          )}
          {garage.review_count > 0 && <Row label="Rating" value={`${Number(garage.avg_rating).toFixed(1)} from ${garage.review_count} reviews`} />}
          {garage.status === 'active' && (
            <Text accessibilityRole="link" onPress={() => Linking.openURL(`https://garix.ie/garages/${garage.slug}`)}
              style={{ fontFamily: fonts.medium, color: colors.navy, paddingVertical: 8, fontSize: 15 }}>
              View your public profile
            </Text>
          )}
          <Muted>Edit your services, opening hours and photos on garix.ie.</Muted>
        </Card>
      )}

      {garage && (
        <Card>
          <H2>Credits</H2>
          <Row label="Balance" value={`${wallet.data?.balance ?? 0} credits`} />
          <Muted>Your credits are shared between the Garix app and website.</Muted>
          {garage.status === 'active' && <BuyButton garageId={garage.id} product="credits" title="Buy credits" />}
          {!showLedger ? (
            <Button title="Show recent activity" variant="secondary" onPress={() => setShowLedger(true)} />
          ) : ledger.isPending ? (
            <Loading />
          ) : ledger.data?.length === 0 ? (
            <Muted>No activity yet.</Muted>
          ) : (
            ledger.data?.map((t) => (
              <View key={t.id} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 4 }}>
                <View style={{ flex: 1 }}>
                  <Body>{LEDGER_LABELS[t.type] ?? t.description ?? t.type}</Body>
                  <Muted style={{ fontSize: 12 }}>{new Date(t.created_at).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' })}</Muted>
                </View>
                <Body style={{ fontFamily: fonts.semibold, color: t.amount > 0 ? colors.success : colors.charcoal }}>
                  {t.amount > 0 ? `+${t.amount}` : t.amount}
                </Body>
              </View>
            ))
          )}
        </Card>
      )}

      <ProfileCard />
      <NotificationSettings />
      <HelpLinks />
      <Button title="Sign out" variant="secondary" onPress={() => supabase.auth.signOut()} />
      <DeleteAccountCard jobsRoute="/garage/quotes" />
    </Screen>
  );
}

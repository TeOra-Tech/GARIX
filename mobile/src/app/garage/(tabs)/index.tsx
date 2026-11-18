import { View } from 'react-native';
import { router } from 'expo-router';
import { useGarage } from '@/lib/garage-context';
import {
  isProSubscription,
  useGarageQuotes,
  useGarageQuotesToday,
  useGarageSubscription,
  usePlansEnabled,
  useRequestFeed,
  useWallet,
} from '@/lib/garage';
import { URGENCY_LABELS } from '@/shared/validation/request';
import { GarageHeader } from '@/components/garage-header';
import { Body, Card, ErrorText, Loading, Muted, Pill, Screen } from '@/components/ui';
import { colors, fonts } from '@/lib/theme';

const STATUS_COPY: Record<string, string> = {
  pending_verification: 'Your garage is waiting for verification. You can see requests once it’s approved.',
  pending_approval: 'Your garage is waiting for approval. You can see requests once it’s approved.',
  suspended: 'Your garage is suspended. Contact garages@garix.ie.',
  rejected: 'Your garage application was not approved. Contact garages@garix.ie.',
};

export default function GarageFeed() {
  const { garage, loading } = useGarage();
  const active = garage?.status === 'active';
  const feed = useRequestFeed(active);
  const quotes = useGarageQuotes(garage?.id);
  const wallet = useWallet(garage?.id);
  const plansEnabled = usePlansEnabled().data ?? false;
  const sub = useGarageSubscription(garage?.id);
  const isPro = plansEnabled && isProSubscription(sub.data);
  const today = useGarageQuotesToday(plansEnabled && !isPro ? garage?.id : undefined);
  const quotedIds = new Set(quotes.data?.map((q) => q.request_id));

  if (loading) return <Screen><Loading /></Screen>;
  if (!garage) {
    return (
      <Screen>
        <GarageHeader />
        <Muted>You don’t have a garage yet. Register your garage on garix.ie, then sign in here.</Muted>
      </Screen>
    );
  }

  return (
    <Screen>
      <GarageHeader />

      {!active && (
        <Card style={{ borderColor: colors.warning }}>
          <Body>{STATUS_COPY[garage.status] ?? 'Your garage is not active yet.'}</Body>
        </Card>
      )}

      {active && (
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Muted>Credits</Muted>
            <Body style={{ fontFamily: fonts.semibold }}>{wallet.data?.balance ?? 0}</Body>
          </View>
          {plansEnabled && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Muted>Plan</Muted>
              <Body style={{ fontFamily: fonts.semibold }}>
                {isPro ? 'Pro — unlimited quotes' : `Basic — ${today.data ?? 0} of 3 quotes today`}
              </Body>
            </View>
          )}
        </Card>
      )}

      {active && feed.isPending && <Loading label="Loading requests…" />}
      {feed.isError && <ErrorText>Could not load requests. Reopen the tab to retry.</ErrorText>}
      {active && feed.data?.length === 0 && <Muted>No open requests right now. We’ll notify you when a new one is posted near you.</Muted>}
      {feed.data?.map((r) => {
        const quoted = quotedIds.has(r.id);
        const vehicle = r.vehicles
          ? [r.vehicles.year, r.vehicles.vehicle_makes?.name ?? r.vehicles.make_text, r.vehicles.vehicle_models?.name ?? r.vehicles.model_text].filter(Boolean).join(' ')
          : null;
        return (
          <Card key={r.id} onPress={() => router.push(`/garage/requests/${r.id}`)} accessibilityLabel={`${r.title}${quoted ? ', quoted' : ''}`}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <Body style={{ flex: 1, fontFamily: fonts.semibold }}>{r.title}</Body>
              {quoted ? <Pill text="Quoted" tone="success" /> : r.urgency === 'emergency' ? <Pill text="Urgent" tone="danger" /> : null}
            </View>
            <Muted>
              {[r.service_category?.name, vehicle, r.location_town && `${r.location_town}${r.location_county ? `, Co. ${r.location_county}` : ''}`]
                .filter(Boolean)
                .join(' · ')}
            </Muted>
            <Muted>
              {URGENCY_LABELS[r.urgency as keyof typeof URGENCY_LABELS]}
              {r.request_attachments.length ? ` · ${r.request_attachments.length} photo${r.request_attachments.length > 1 ? 's' : ''}` : ''}
            </Muted>
          </Card>
        );
      })}
    </Screen>
  );
}

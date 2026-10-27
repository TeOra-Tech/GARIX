import { View } from 'react-native';
import { router } from 'expo-router';
import { useMyRequests, vehicleName } from '@/lib/queries';
import { URGENCY_LABELS } from '@/shared/validation/request';
import { Body, Button, Card, ErrorText, Loading, Muted, Pill, Screen } from '@/components/ui';
import { fonts } from '@/lib/theme';

const TONE: Record<string, 'navy' | 'success' | 'warning' | 'danger' | 'muted'> = {
  open: 'navy', quoted: 'success', accepted: 'success', in_progress: 'warning',
  completed: 'muted', cancelled: 'muted', expired: 'muted', draft: 'muted',
};

export default function Requests() {
  const requests = useMyRequests();
  return (
    <Screen edges={[]}>
      <Button title="New request" onPress={() => router.push('/requests/new')} />
      {requests.isPending && <Loading />}
      {requests.isError && <ErrorText>Could not load your requests. Reopen the tab to retry.</ErrorText>}
      {requests.data?.length === 0 && <Muted>No requests yet. Post one to get quotes from garages near you.</Muted>}
      {requests.data?.map((r) => (
        <Card key={r.id} onPress={() => router.push(`/requests/${r.id}`)} accessibilityLabel={`${r.title}, ${r.status.replace('_', ' ')}`}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
            <Body style={{ flex: 1, fontFamily: fonts.semibold }}>{r.title}</Body>
            <Pill text={r.status.replace('_', ' ')} tone={TONE[r.status] ?? 'navy'} />
          </View>
          <Muted>
            {[r.vehicles ? `${vehicleName(r.vehicles)} (${r.vehicles.registration_number})` : null, URGENCY_LABELS[r.urgency as keyof typeof URGENCY_LABELS], r.location_town]
              .filter(Boolean)
              .join(' · ')}
          </Muted>
          <Muted>Posted {new Date(r.created_at).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' })}</Muted>
        </Card>
      ))}
    </Screen>
  );
}

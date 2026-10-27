import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { useMyRequests, useVehicles, vehicleName } from '@/lib/queries';
import { Body, Button, Card, H1, H2, Loading, Muted, Pill, Screen } from '@/components/ui';
import { colors, fonts } from '@/lib/theme';

export default function Home() {
  const { profile } = useAuth();
  const vehicles = useVehicles();
  const requests = useMyRequests();
  const firstName = profile?.full_name?.split(' ')[0];
  const active = requests.data?.filter((r) => ['open', 'quoted', 'accepted', 'in_progress'].includes(r.status)) ?? [];

  return (
    <Screen>
      <View style={{ gap: 4 }}>
        <Text style={{ fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 2, color: colors.goldText }}>
          {profile?.account_type === 'fleet' ? 'GARIX FOR BUSINESS' : 'YOUR DASHBOARD'}
        </Text>
        <H1>{firstName ? `Hi ${firstName}` : 'Welcome'}</H1>
      </View>

      <Button title="Get quotes for a repair" onPress={() => router.push('/requests/new')} />

      <Card>
        <H2>Active requests</H2>
        {requests.isPending ? (
          <Loading />
        ) : active.length === 0 ? (
          <Muted>No active requests. Post one and verified garages near you will send quotes.</Muted>
        ) : (
          active.slice(0, 3).map((r) => (
            <Card key={r.id} style={{ backgroundColor: colors.white }} onPress={() => router.push(`/requests/${r.id}`)} accessibilityLabel={`${r.title}, ${r.status.replace('_', ' ')}`}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                <Body style={{ flex: 1, fontFamily: fonts.semibold }}>{r.title}</Body>
                <Pill text={r.status.replace('_', ' ')} tone={r.status === 'quoted' ? 'success' : 'navy'} />
              </View>
            </Card>
          ))
        )}
      </Card>

      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <H2>My vehicles</H2>
          <Text accessibilityRole="button" onPress={() => router.push('/vehicles/new')} style={{ fontFamily: fonts.semibold, color: colors.navy, padding: 8 }}>
            Add a vehicle
          </Text>
        </View>
        {vehicles.isPending ? (
          <Loading />
        ) : vehicles.data?.length === 0 ? (
          <Muted>Add your car to start getting quotes.</Muted>
        ) : (
          vehicles.data?.map((v) => (
            <Card key={v.id} style={{ backgroundColor: colors.white }} onPress={() => router.push(`/vehicles/${v.id}`)} accessibilityLabel={`${vehicleName(v)}, ${v.registration_number}`}>
              <Body style={{ fontFamily: fonts.medium }}>{vehicleName(v) || 'Vehicle'}</Body>
              <Muted style={{ color: colors.navy }}>{v.registration_number}</Muted>
            </Card>
          ))
        )}
      </Card>
    </Screen>
  );
}

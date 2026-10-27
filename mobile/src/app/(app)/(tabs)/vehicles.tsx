import { router } from 'expo-router';
import { useVehicles, vehicleName } from '@/lib/queries';
import { useAuth } from '@/lib/auth';
import { Body, Button, Card, ErrorText, Loading, Muted, Screen } from '@/components/ui';
import { colors, fonts } from '@/lib/theme';

export default function Vehicles() {
  const vehicles = useVehicles();
  const { profile } = useAuth();
  const atLimit = profile?.account_type !== 'fleet' && (vehicles.data?.length ?? 0) >= 3;

  return (
    <Screen edges={[]}>
      <Button title="Add a vehicle" onPress={() => router.push('/vehicles/new')} disabled={atLimit} />
      {atLimit && <Muted>Personal accounts can hold up to 3 vehicles. Garix for business has no limit.</Muted>}
      {vehicles.isPending && <Loading />}
      {vehicles.isError && <ErrorText>Could not load your vehicles. Pull down or reopen the tab to retry.</ErrorText>}
      {vehicles.data?.length === 0 && <Muted>You haven’t added a vehicle yet.</Muted>}
      {vehicles.data?.map((v) => (
        <Card key={v.id} onPress={() => router.push(`/vehicles/${v.id}`)} accessibilityLabel={`${vehicleName(v)}, ${v.registration_number}`}>
          <Body style={{ fontFamily: fonts.semibold }}>{vehicleName(v) || 'Vehicle'}</Body>
          <Muted style={{ color: colors.navy }}>{v.registration_number}</Muted>
          {v.mileage_km != null && <Muted>{v.mileage_km.toLocaleString('en-IE')} km</Muted>}
        </Card>
      ))}
    </Screen>
  );
}

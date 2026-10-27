import { Alert, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useDeleteVehicle, useVehicle, vehicleErrorMessage, vehicleName } from '@/lib/queries';
import { Body, Button, Card, ErrorText, H1, Loading, Muted, Screen } from '@/components/ui';
import { colors } from '@/lib/theme';

export default function VehicleDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const vehicle = useVehicle(id);
  const remove = useDeleteVehicle();
  const v = vehicle.data;

  function confirmRemove() {
    Alert.alert('Remove this vehicle?', 'Its service history and reminders are removed too.', [
      { text: 'Keep it', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => remove.mutate(id, { onSuccess: () => router.back() }) },
    ]);
  }

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: v?.registration_number ?? 'Vehicle' }} />
      {vehicle.isPending && <Loading />}
      {vehicle.isError && <ErrorText>Could not load this vehicle.</ErrorText>}
      {v && (
        <>
          <View style={{ gap: 4 }}>
            <H1>{vehicleName(v) || 'Vehicle'}</H1>
            <Muted style={{ color: colors.navy }}>{v.registration_number}</Muted>
          </View>
          <Card>
            {[
              ['Fuel', v.fuel_type?.replace('_', ' ')],
              ['Gearbox', v.transmission?.replace('_', ' ')],
              ['Engine', v.vehicle_engines?.label ?? v.engine_size_custom],
              ['Mileage', v.mileage_km != null ? `${v.mileage_km.toLocaleString('en-IE')} km` : null],
            ]
              .filter(([, value]) => value)
              .map(([label, value]) => (
                <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Muted>{label}</Muted>
                  <Body style={{ textTransform: 'capitalize' }}>{value}</Body>
                </View>
              ))}
          </Card>
          <Button title="Get quotes for this vehicle" onPress={() => router.push({ pathname: '/requests/new', params: { vehicleId: v.id } })} />
          <Muted>Service history, reminders and ownership transfers are on garix.ie for now and are coming to the app.</Muted>
          <ErrorText>{remove.isError ? vehicleErrorMessage(remove.error) : null}</ErrorText>
          <Button title="Remove vehicle" variant="dangerOutline" onPress={confirmRemove} loading={remove.isPending} />
        </>
      )}
    </Screen>
  );
}

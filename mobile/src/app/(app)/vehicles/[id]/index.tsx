import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useDeleteVehicle, useVehicle, vehicleErrorMessage, vehicleName } from '@/lib/queries';
import {
  formatDate,
  isoDate,
  transferErrorMessage,
  useCancelTransfer,
  useCompleteReminder,
  useDeleteReminder,
  useDeleteServiceRecord,
  useInitiateTransfer,
  useReminders,
  useServiceRecords,
  useTransfers,
} from '@/lib/vehicle-care';
import { recordTypeLabel, reminderTypeLabel, transferSchema } from '@/shared/validation/vehicle-care';
import { formatEur } from '@/shared/vat';
import { Body, Button, Card, ErrorText, H1, H2, Loading, Muted, Screen, TextField } from '@/components/ui';
import { colors, fonts } from '@/lib/theme';

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <Muted>{label}</Muted>
      <Body style={{ flexShrink: 1, textAlign: 'right' }}>{value}</Body>
    </View>
  );
}

function SmallLink({ title, onPress, danger }: { title: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={{ paddingVertical: 8, paddingRight: 16, minHeight: 44, justifyContent: 'center' }}>
      <Text style={{ fontFamily: fonts.semibold, color: danger ? colors.danger : colors.navy }}>{title}</Text>
    </Pressable>
  );
}

function ServiceHistory({ vehicleId }: { vehicleId: string }) {
  const records = useServiceRecords(vehicleId);
  const remove = useDeleteServiceRecord(vehicleId);
  return (
    <Card>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <H2>Service history</H2>
        <SmallLink title="Add record" onPress={() => router.push(`/vehicles/${vehicleId}/record-new`)} />
      </View>
      {records.isPending && <Loading />}
      {records.data?.length === 0 && <Muted>No records yet. Add services, repairs and NCTs to keep a full history.</Muted>}
      {records.data?.map((r) => (
        <View key={r.id} style={{ borderTopWidth: 1, borderColor: colors.line, paddingTop: 10, gap: 2 }}>
          <Body style={{ fontFamily: fonts.semibold }}>{r.title || recordTypeLabel(r.event_type)}</Body>
          <Muted>
            {[formatDate(r.event_date), r.mileage_km != null ? `${r.mileage_km.toLocaleString('en-IE')} km` : null, r.garage_name, r.cost_eur != null ? formatEur(Number(r.cost_eur)) : null]
              .filter(Boolean)
              .join(' · ')}
          </Muted>
          {r.description ? <Body>{r.description}</Body> : null}
          {r.parts_replaced ? <Muted>Parts: {r.parts_replaced}</Muted> : null}
          {r.next_due_date ? <Muted>Next due {formatDate(r.next_due_date)}</Muted> : null}
          {r.event_type !== 'ownership_change' && (
            <SmallLink
              title="Delete"
              danger
              onPress={() =>
                Alert.alert('Delete this record?', 'It will be removed from the service history.', [
                  { text: 'Keep it', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => remove.mutate(r.id) },
                ])
              }
            />
          )}
        </View>
      ))}
    </Card>
  );
}

function Reminders({ vehicleId }: { vehicleId: string }) {
  const reminders = useReminders(vehicleId);
  const complete = useCompleteReminder();
  const remove = useDeleteReminder();
  const open = reminders.data?.filter((r) => !r.completed_at) ?? [];
  const today = isoDate(new Date());
  return (
    <Card>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <H2>Reminders</H2>
        <SmallLink title="Add reminder" onPress={() => router.push(`/vehicles/${vehicleId}/reminder-new`)} />
      </View>
      {reminders.isPending && <Loading />}
      {!reminders.isPending && open.length === 0 && (
        <Muted>No reminders. Set NCT, service, insurance or road tax reminders and we’ll notify you 14 days before.</Muted>
      )}
      {open.map((r) => {
        const overdue = r.due_date < today;
        return (
          <View key={r.id} style={{ borderTopWidth: 1, borderColor: colors.line, paddingTop: 10, gap: 2 }}>
            <Body style={{ fontFamily: fonts.semibold }}>{r.title || reminderTypeLabel(r.reminder_type)}</Body>
            <Muted style={overdue ? { color: colors.danger } : undefined}>
              {overdue ? 'Overdue — was due ' : 'Due '}
              {formatDate(r.due_date)}
              {r.interval_months ? ` · repeats every ${r.interval_months} month${r.interval_months > 1 ? 's' : ''}` : ''}
            </Muted>
            <View style={{ flexDirection: 'row' }}>
              <SmallLink title="Mark done" onPress={() => complete.mutate(r)} />
              <SmallLink title="Delete" danger onPress={() => remove.mutate(r.id)} />
            </View>
          </View>
        );
      })}
    </Card>
  );
}

function Transfer({ vehicleId }: { vehicleId: string }) {
  const transfers = useTransfers();
  const initiate = useInitiateTransfer(vehicleId);
  const cancel = useCancelTransfer();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const pending = transfers.data?.rows.find(
    (t) => t.vehicle_id === vehicleId && t.status === 'pending' && t.from_user_id === transfers.data.userId,
  );

  function send() {
    const parsed = transferSchema.safeParse({ toEmail: email });
    if (!parsed.success) return setError(parsed.error.issues[0].message);
    setError(null);
    Alert.alert('Transfer this vehicle?', `We’ll ask ${parsed.data.toEmail} to accept it. Its service history goes with it.`, [
      { text: 'Not now', style: 'cancel' },
      { text: 'Send transfer', onPress: () => initiate.mutate(parsed.data.toEmail, { onSuccess: () => { setEmail(''); setOpen(false); } }) },
    ]);
  }

  return (
    <Card>
      <H2>Change of ownership</H2>
      {pending ? (
        <>
          <Body>Transfer pending — waiting for the new owner to accept {pending.vehicle_label}.</Body>
          <Button title="Cancel transfer" variant="secondary" loading={cancel.isPending} onPress={() => cancel.mutate(pending.id)} />
          <ErrorText>{cancel.isError ? transferErrorMessage(cancel.error) : null}</ErrorText>
        </>
      ) : !open ? (
        <>
          <Muted>Sold or gave away this vehicle? Transfer it to the new owner’s Garix account. They must accept before anything changes.</Muted>
          <Button title="Transfer to a new owner" variant="secondary" onPress={() => setOpen(true)} />
        </>
      ) : (
        <>
          <TextField
            label="New owner’s Garix email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            error={error ?? undefined}
          />
          <ErrorText>{initiate.isError ? transferErrorMessage(initiate.error) : null}</ErrorText>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Button title="Send transfer" style={{ flex: 1 }} loading={initiate.isPending} onPress={send} />
            <Button title="Cancel" variant="secondary" style={{ flex: 1 }} onPress={() => { setOpen(false); setError(null); }} />
          </View>
        </>
      )}
    </Card>
  );
}

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
            <Row label="Fuel" value={v.fuel_type?.replace('_', ' ')} />
            <Row label="Gearbox" value={v.transmission?.replace('_', ' ')} />
            <Row label="Engine" value={v.vehicle_engines?.label ?? v.engine_size_custom} />
            <Row label="Mileage" value={v.mileage_km != null ? `${v.mileage_km.toLocaleString('en-IE')} km` : null} />
          </Card>
          <Button title="Get quotes for this vehicle" onPress={() => router.push({ pathname: '/requests/new', params: { vehicleId: v.id } })} />
          <Reminders vehicleId={v.id} />
          <ServiceHistory vehicleId={v.id} />
          <Transfer vehicleId={v.id} />
          <ErrorText>{remove.isError ? vehicleErrorMessage(remove.error) : null}</ErrorText>
          <Button title="Remove vehicle" variant="dangerOutline" onPress={confirmRemove} loading={remove.isPending} />
        </>
      )}
    </Screen>
  );
}

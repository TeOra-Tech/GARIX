import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { useMyRequests, useVehicles, vehicleName } from '@/lib/queries';
import { useUnreadNotificationCount } from '@/lib/inbox';
import { formatDate, isoDate, useUpcomingReminders } from '@/lib/vehicle-care';
import { reminderTypeLabel } from '@/shared/validation/vehicle-care';
import { TransferInbox } from '@/components/transfer-inbox';
import { Body, Button, Card, H1, H2, Loading, Muted, Pill, Screen } from '@/components/ui';
import { colors, fonts } from '@/lib/theme';

export default function Home() {
  const { profile } = useAuth();
  const vehicles = useVehicles();
  const requests = useMyRequests();
  const unread = useUnreadNotificationCount().data ?? 0;
  const reminders = useUpcomingReminders();
  const today = isoDate(new Date());
  const firstName = profile?.full_name?.split(' ')[0];
  const active = requests.data?.filter((r) => ['open', 'quoted', 'accepted', 'in_progress'].includes(r.status)) ?? [];

  return (
    <Screen>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ gap: 4, flex: 1 }}>
          <Text style={{ fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 2, color: colors.goldText }}>
            {profile?.account_type === 'fleet' ? 'GARIX FOR BUSINESS' : 'YOUR DASHBOARD'}
          </Text>
          <H1>{firstName ? `Hi ${firstName}` : 'Welcome'}</H1>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={unread ? `Notifications, ${unread} unread` : 'Notifications'}
          onPress={() => router.push('/notifications')}
          style={{ minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="notifications-outline" size={26} color={colors.navy} />
          {unread > 0 && (
            <View style={{ position: 'absolute', top: 6, right: 6, backgroundColor: colors.danger, borderRadius: 999, minWidth: 18, paddingHorizontal: 4, alignItems: 'center' }}>
              <Text style={{ color: colors.white, fontFamily: fonts.semibold, fontSize: 11 }}>{unread > 9 ? '9+' : unread}</Text>
            </View>
          )}
        </Pressable>
      </View>

      <Button title="Get quotes for a repair" onPress={() => router.push('/requests/new')} />

      <TransferInbox />

      {(reminders.data?.length ?? 0) > 0 && (
        <Card>
          <H2>Upcoming maintenance</H2>
          {reminders.data!.map((r) => (
            <Pressable key={r.id} accessibilityRole="button" onPress={() => router.push(`/vehicles/${r.vehicle_id}`)} style={{ paddingVertical: 6 }}>
              <Body style={{ fontFamily: fonts.medium }}>{r.title || reminderTypeLabel(r.reminder_type)} · {r.vehicles?.registration_number}</Body>
              <Muted style={r.due_date < today ? { color: colors.danger } : undefined}>{r.due_date < today ? 'Overdue — was due ' : 'Due '}{formatDate(r.due_date)}</Muted>
            </Pressable>
          ))}
        </Card>
      )}

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

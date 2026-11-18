import { Stack } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { useRealtimeInbox } from '@/lib/inbox';
import { GarageProvider } from '@/lib/garage-context';
import { colors, fonts } from '@/lib/theme';

/** Garage-owner side of the app. Customers and fleets use the (app) group instead. */
export default function GarageLayout() {
  const { session } = useAuth();
  useRealtimeInbox(session?.user.id);

  return (
    <GarageProvider>
      <Stack
        screenOptions={{
          headerTintColor: colors.navy,
          headerTitleStyle: { fontFamily: fonts.semibold },
          headerBackTitle: 'Back',
          contentStyle: { backgroundColor: colors.white },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="requests/[id]" options={{ title: 'Request' }} />
        <Stack.Screen name="messages/[id]" options={{ title: 'Messages' }} />
        <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
      </Stack>
    </GarageProvider>
  );
}

import { useEffect, useRef } from 'react';
import { Stack, router } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { useRealtimeInbox } from '@/lib/inbox';
import { colors, fonts } from '@/lib/theme';

export default function AppLayout() {
  const { session } = useAuth();
  // Live badges for new notifications and messages anywhere in the signed-in app.
  useRealtimeInbox(session?.user.id);

  // Chose "Garage" when creating the account: go straight to garage registration (once per launch).
  const sentToGarageForm = useRef(false);
  const wantsGarage = session?.user.user_metadata?.signup_intent === 'garage';
  useEffect(() => {
    if (!wantsGarage || sentToGarageForm.current) return;
    sentToGarageForm.current = true;
    const t = setTimeout(() => router.push('/garage-register'), 0);
    return () => clearTimeout(t);
  }, [wantsGarage]);

  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.navy,
        headerTitleStyle: { fontFamily: fonts.semibold },
        headerBackTitle: 'Back',
        contentStyle: { backgroundColor: colors.white },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="vehicles/new" options={{ title: 'Add a vehicle', presentation: 'modal' }} />
      <Stack.Screen name="vehicles/[id]/index" options={{ title: 'Vehicle' }} />
      <Stack.Screen name="vehicles/[id]/record-new" options={{ title: 'Add service record', presentation: 'modal' }} />
      <Stack.Screen name="vehicles/[id]/reminder-new" options={{ title: 'Add reminder', presentation: 'modal' }} />
      <Stack.Screen name="requests/new" options={{ title: 'New request' }} />
      <Stack.Screen name="requests/[id]/index" options={{ title: 'Request' }} />
      <Stack.Screen name="requests/[id]/edit" options={{ title: 'Edit request' }} />
      <Stack.Screen name="messages/[id]" options={{ title: 'Messages' }} />
      <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
      <Stack.Screen name="garage-register" options={{ title: 'Register a garage' }} />
    </Stack>
  );
}

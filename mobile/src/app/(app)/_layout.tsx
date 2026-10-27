import { Stack } from 'expo-router';
import { colors, fonts } from '@/lib/theme';

export default function AppLayout() {
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
      <Stack.Screen name="vehicles/[id]" options={{ title: 'Vehicle' }} />
      <Stack.Screen name="requests/new" options={{ title: 'New request' }} />
      <Stack.Screen name="requests/[id]/index" options={{ title: 'Request' }} />
      <Stack.Screen name="requests/[id]/edit" options={{ title: 'Edit request' }} />
    </Stack>
  );
}

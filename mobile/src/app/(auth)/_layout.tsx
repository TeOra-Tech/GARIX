import { Stack } from 'expo-router';
import { colors, fonts } from '@/lib/theme';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.navy,
        headerTitleStyle: { fontFamily: fonts.semibold },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.white },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ title: 'Create account' }} />
    </Stack>
  );
}

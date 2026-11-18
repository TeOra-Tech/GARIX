import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import { AuthProvider, useAuth } from '@/lib/auth';
import { usePurchaseSupport } from '@/lib/payments';
import { colors, fonts } from '@/lib/theme';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { session, profile } = useAuth();
  const signedIn = !!session;
  const role = profile?.role;
  // Apple only allows spending credits bought on the web if they can also be bought in the
  // app, so on iPhone the garage side needs the EU purchase link (iOS version + Irish/EU
  // App Store account). Android has no such rule.
  const iosGarage = Platform.OS === 'ios' && role === 'garage_owner';
  const purchase = usePurchaseSupport(iosGarage);
  const garageToolsEnabled = Platform.OS !== 'ios' || purchase.data === true;
  // Hold the splash until we know who (if anyone) is signed in, and what they can use.
  const ready = session !== undefined && (!signedIn || profile !== undefined) && (!iosGarage || !purchase.isPending);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);
  if (!ready) return null;

  const customerSide = role === 'customer';
  const garageSide = role === 'garage_owner' && garageToolsEnabled;

  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.navy,
        headerTitleStyle: { fontFamily: fonts.semibold },
        headerBackTitle: 'Back',
        contentStyle: { backgroundColor: colors.white },
      }}
    >
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && customerSide}>
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && garageSide}>
        <Stack.Screen name="garage" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && !customerSide && !garageSide}>
        <Stack.Screen name="other-roles" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } }),
  );
  const [fontsLoaded] = useFonts({ Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold });
  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StatusBar style="dark" />
          <RootNavigator />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

import '../styles/global.css';
import '@/src/i18n';
import { useState, useEffect } from 'react';
import { Stack, Redirect, useSegments, useRootNavigationState } from 'expo-router';
import { useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Toaster } from 'sonner-native';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Inter_300Light,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { DatabaseProvider } from '@/src/db/provider';
import { usePreferencesStore } from '@/src/store/preferences';

SplashScreen.preventAutoHideAsync();

function useStoreHydrated() {
  const [hydrated, setHydrated] = useState(usePreferencesStore.persist.hasHydrated());

  useEffect(() => {
    const unsub = usePreferencesStore.persist.onFinishHydration(() => setHydrated(true));
    return unsub;
  }, []);

  return hydrated;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const segments = useSegments();
  const navigationState = useRootNavigationState();
  const storeHydrated = useStoreHydrated();
  const hasCompletedOnboarding = usePreferencesStore((state) => state.hasCompletedOnboarding);

  const [fontsLoaded, fontError] = useFonts({
    Inter_300Light,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const appReady = (fontsLoaded || fontError) && storeHydrated;

  useEffect(() => {
    if (appReady) {
      SplashScreen.hideAsync();
    }
  }, [appReady]);

  if (!appReady) {
    return null;
  }

  const isNavigationReady = navigationState?.key;
  const isOnOnboardingScreen = segments[0] === 'onboarding';

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <DatabaseProvider>
          <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: {
                backgroundColor: colorScheme === 'dark' ? '#1A1918' : '#FFFDE1',
              },
            }}
          >
            <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="scan" />
            <Stack.Screen
              name="settings"
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
              }}
            />
          </Stack>
          {isNavigationReady && !hasCompletedOnboarding && !isOnOnboardingScreen && (
            <Redirect href="/onboarding" />
          )}
          <Toaster />
        </DatabaseProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

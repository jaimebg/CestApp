import '../styles/global.css';
import '@/src/i18n';
import { useState, useEffect } from 'react';
import { Stack, useSegments, useRootNavigationState, useRouter } from 'expo-router';
import { useColorScheme, InteractionManager } from 'react-native';
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
  const router = useRouter();
  const storeHydrated = useStoreHydrated();
  const hasCompletedOnboarding = usePreferencesStore((state) => state.hasCompletedOnboarding);
  const bgColor = colorScheme === 'dark' ? '#1A1918' : '#FFFDE1';

  const [fontsLoaded, fontError] = useFonts({
    Inter_300Light,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const appReady = (fontsLoaded || fontError) && storeHydrated;
  const isNavigationReady = !!navigationState?.key;
  const isOnOnboardingScreen = segments[0] === 'onboarding';

  useEffect(() => {
    if (!appReady || !isNavigationReady) return;

    if (!hasCompletedOnboarding && !isOnOnboardingScreen) {
      router.replace('/onboarding');
      return;
    }

    const handle = InteractionManager.runAfterInteractions(() => {
      SplashScreen.hideAsync();
    });
    return () => handle.cancel();
  }, [appReady, isNavigationReady, hasCompletedOnboarding, isOnOnboardingScreen, router]);

  if (!appReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: bgColor }}>
      <SafeAreaProvider>
        <DatabaseProvider>
          <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: bgColor },
            }}
          >
            <Stack.Screen
              name="onboarding"
              options={{ gestureEnabled: false, animation: 'none' }}
            />
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
          <Toaster />
        </DatabaseProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

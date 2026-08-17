import '../styles/global.css';
import '@/src/i18n';
import { useState, useEffect, useLayoutEffect } from 'react';
import { Stack, useSegments, useRootNavigationState, useRouter } from 'expo-router';
import { InteractionManager } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { colorScheme as nativewindColorScheme } from 'nativewind';
import { Toaster } from 'sonner-native';
import { ErrorBoundary } from '@/src/components/ErrorBoundary';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from '@expo-google-fonts/inter';
import { DatabaseProvider } from '@/src/db/provider';
import { usePreferencesStore, type ColorScheme } from '@/src/store/preferences';
import { lightColors, darkColors } from '@/src/theme/colors';
import { fontModules } from '@/src/theme/type';

SplashScreen.preventAutoHideAsync();

function useStoreHydrated() {
  const [hydrated, setHydrated] = useState(usePreferencesStore.persist.hasHydrated());

  useEffect(() => {
    const unsub = usePreferencesStore.persist.onFinishHydration(() => setHydrated(true));
    return unsub;
  }, []);

  return hydrated;
}

/**
 * Pushes the stored appearance preference into NativeWind.
 *
 * tailwind.config.js runs in `darkMode: 'class'`, so `dark:` variants do not
 * follow the OS on their own — this is what drives them. Without it the
 * className half of the app and the useAppColors() half render different
 * themes the moment the two disagree. Layout effect so it lands before paint.
 */
function useSyncedColorScheme(scheme: ColorScheme) {
  useLayoutEffect(() => {
    nativewindColorScheme.set(scheme);
  }, [scheme]);
}

export default function RootLayout() {
  const colorScheme = usePreferencesStore((state) => state.colorScheme);
  const segments = useSegments();
  const navigationState = useRootNavigationState();
  const router = useRouter();
  const storeHydrated = useStoreHydrated();
  const hasCompletedOnboarding = usePreferencesStore((state) => state.hasCompletedOnboarding);
  const bgColor = colorScheme === 'dark' ? darkColors.background : lightColors.background;

  useSyncedColorScheme(colorScheme);

  const [fontsLoaded, fontError] = useFonts(fontModules);

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
          {/* Catches render errors anywhere in the tree so a bad receipt row
              shows a retry instead of unmounting the app to a blank screen. */}
          <ErrorBoundary>
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
          </ErrorBoundary>
          <Toaster />
        </DatabaseProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

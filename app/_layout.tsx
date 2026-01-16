import '../styles/global.css';
import '@/src/i18n'; // Initialize i18n
import { useEffect } from 'react';
import { Stack, Redirect, useSegments, useRootNavigationState } from 'expo-router';
import { useColorScheme, View, ActivityIndicator } from 'react-native';
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

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const segments = useSegments();
  const navigationState = useRootNavigationState();
  const hasCompletedOnboarding = usePreferencesStore((state) => state.hasCompletedOnboarding);

  const [fontsLoaded] = useFonts({
    Inter_300Light,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // Wait for fonts to load
  if (!fontsLoaded) {
    return (
      <SafeAreaProvider>
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: colorScheme === 'dark' ? '#1A1918' : '#FFFDE1',
          }}
        >
          <ActivityIndicator size="large" color="#93BD57" />
        </View>
      </SafeAreaProvider>
    );
  }

  // Check if navigation is ready before redirecting
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
          </Stack>
          {/* Redirect logic - only when navigation is ready */}
          {isNavigationReady && !hasCompletedOnboarding && !isOnOnboardingScreen && (
            <Redirect href="/onboarding" />
          )}
          <Toaster />
        </DatabaseProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

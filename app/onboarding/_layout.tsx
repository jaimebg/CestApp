/**
 * Onboarding Layout
 * Stack navigator for onboarding flow screens
 */

import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';

export default function OnboardingLayout() {
  const colorScheme = useColorScheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,
        contentStyle: {
          backgroundColor: colorScheme === 'dark' ? '#1A1918' : '#FFFDE1',
        },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="preferences" />
    </Stack>
  );
}

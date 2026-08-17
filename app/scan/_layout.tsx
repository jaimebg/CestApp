import { Stack } from 'expo-router';
import { useAppColors } from '@/src/hooks/useAppColors';

export default function ScanLayout() {
  const colors = useAppColors();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: colors.background,
        },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="preview" />
      <Stack.Screen name="review" />
      <Stack.Screen
        name="zones"
        options={{
          presentation: 'fullScreenModal',
          animation: 'slide_from_bottom',
        }}
      />
    </Stack>
  );
}

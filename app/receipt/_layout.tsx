import { Stack } from 'expo-router';
import { useIsDarkMode } from '@/src/hooks/useAppColors';

export default function ReceiptLayout() {
  const isDark = useIsDarkMode();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: isDark ? '#1A1918' : '#FFFDE1',
        },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="[id]" />
    </Stack>
  );
}

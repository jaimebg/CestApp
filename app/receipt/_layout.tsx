import { Stack } from 'expo-router';
import { useAppColors } from '@/src/hooks/useAppColors';

export default function ReceiptLayout() {
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
      <Stack.Screen name="[id]" />
    </Stack>
  );
}

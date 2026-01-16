import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';

export default function ReceiptLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

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

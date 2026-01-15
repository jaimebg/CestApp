import { View, Text, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, Badge } from '@/src/components/ui';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      className="flex-1 bg-background dark:bg-background-dark"
      contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 32 }}
    >
      <View className="px-6 pt-4">
        <Text className="text-3xl text-text dark:text-text-dark" style={{ fontFamily: 'Inter_700Bold' }}>
          Dashboard
        </Text>
        <Text className="text-base text-text-secondary dark:text-text-dark-secondary mt-2" style={{ fontFamily: 'Inter_400Regular' }}>
          Your spending overview
        </Text>

        <Card variant="elevated" padding="lg" className="mt-8">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-sm text-text-secondary dark:text-text-dark-secondary" style={{ fontFamily: 'Inter_500Medium' }}>
              This Month
            </Text>
            <Badge variant="success" size="sm" label="On track" />
          </View>
          <Text className="text-4xl text-text dark:text-text-dark" style={{ fontFamily: 'Inter_700Bold' }}>
            $0.00
          </Text>
        </Card>

        <Card variant="filled" padding="lg" className="mt-4">
          <Text className="text-base text-text dark:text-text-dark" style={{ fontFamily: 'Inter_500Medium' }}>
            Start scanning receipts to track your spending
          </Text>
        </Card>

        <Text className="text-lg text-text dark:text-text-dark mt-8 mb-4" style={{ fontFamily: 'Inter_600SemiBold' }}>
          Recent Receipts
        </Text>

        <Card variant="outlined" padding="md">
          <Text className="text-base text-text dark:text-text-dark" style={{ fontFamily: 'Inter_500Medium' }}>
            No receipts yet
          </Text>
          <Text className="text-sm text-text-secondary dark:text-text-dark-secondary mt-1" style={{ fontFamily: 'Inter_400Regular' }}>
            Scan your first receipt to get started
          </Text>
        </Card>
      </View>
    </ScrollView>
  );
}

import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-1 bg-background dark:bg-background-dark"
      style={{ paddingTop: insets.top }}
    >
      <View className="flex-1 px-6 pt-4">
        <Text className="text-3xl text-text dark:text-text-dark" style={{ fontFamily: 'Inter_700Bold' }}>
          Dashboard
        </Text>
        <Text className="text-base text-text-secondary dark:text-text-dark-secondary mt-2" style={{ fontFamily: 'Inter_400Regular' }}>
          Your spending overview
        </Text>

        <View className="mt-8 bg-surface dark:bg-surface-dark rounded-2xl p-6 shadow-sm">
          <Text className="text-sm text-text-secondary dark:text-text-dark-secondary" style={{ fontFamily: 'Inter_500Medium' }}>
            This Month
          </Text>
          <Text className="text-4xl text-text dark:text-text-dark mt-2" style={{ fontFamily: 'Inter_700Bold' }}>
            $0.00
          </Text>
        </View>

        <View className="mt-6 bg-golden/30 rounded-2xl p-6">
          <Text className="text-base text-text dark:text-text-dark" style={{ fontFamily: 'Inter_500Medium' }}>
            Start scanning receipts to track your spending
          </Text>
        </View>
      </View>
    </View>
  );
}

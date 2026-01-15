import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-1 bg-background dark:bg-background-dark"
      style={{ paddingTop: insets.top }}
    >
      <View className="flex-1 px-6 pt-4">
        <Text className="text-3xl text-text dark:text-text-dark" style={{ fontFamily: 'Inter_700Bold' }}>
          History
        </Text>
        <Text className="text-base text-text-secondary dark:text-text-dark-secondary mt-2" style={{ fontFamily: 'Inter_400Regular' }}>
          All your scanned receipts
        </Text>

        <View className="flex-1 justify-center items-center">
          <View className="bg-primary/20 rounded-full p-6 mb-4">
            <Ionicons name="receipt-outline" size={48} color="#3D6B23" />
          </View>
          <Text className="text-lg text-text dark:text-text-dark text-center" style={{ fontFamily: 'Inter_600SemiBold' }}>
            No receipts yet
          </Text>
          <Text className="text-base text-text-secondary dark:text-text-dark-secondary text-center mt-2 px-8" style={{ fontFamily: 'Inter_400Regular' }}>
            Scan your first receipt to start tracking your spending
          </Text>
        </View>
      </View>
    </View>
  );
}

import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  return (
    <View
      className="flex-1 bg-background dark:bg-background-dark"
      style={{ paddingTop: insets.top }}
    >
      <View className="flex-1 px-6 pt-4">
        <Text className="text-3xl text-text dark:text-text-dark" style={{ fontFamily: 'Inter_700Bold' }}>
          {t('analytics.title')}
        </Text>
        <Text className="text-base text-text-secondary dark:text-text-dark-secondary mt-2" style={{ fontFamily: 'Inter_400Regular' }}>
          {t('analytics.subtitle')}
        </Text>

        <View className="flex-1 justify-center items-center">
          <View className="bg-primary/20 rounded-full p-6 mb-4">
            <Ionicons name="stats-chart-outline" size={48} color="#3D6B23" />
          </View>
          <Text className="text-lg text-text dark:text-text-dark text-center" style={{ fontFamily: 'Inter_600SemiBold' }}>
            {t('analytics.noData')}
          </Text>
          <Text className="text-base text-text-secondary dark:text-text-dark-secondary text-center mt-2 px-8" style={{ fontFamily: 'Inter_400Regular' }}>
            {t('analytics.noDataDesc')}
          </Text>
        </View>
      </View>
    </View>
  );
}

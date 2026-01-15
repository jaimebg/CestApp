import { View, Text, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Card, Badge } from '@/src/components/ui';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  return (
    <ScrollView
      className="flex-1 bg-background dark:bg-background-dark"
      contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 32 }}
    >
      <View className="px-6 pt-4">
        <Text className="text-3xl text-text dark:text-text-dark" style={{ fontFamily: 'Inter_700Bold' }}>
          {t('dashboard.title')}
        </Text>
        <Text className="text-base text-text-secondary dark:text-text-dark-secondary mt-2" style={{ fontFamily: 'Inter_400Regular' }}>
          {t('dashboard.subtitle')}
        </Text>

        <Card variant="elevated" padding="lg" className="mt-8">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-sm text-text-secondary dark:text-text-dark-secondary" style={{ fontFamily: 'Inter_500Medium' }}>
              {t('dashboard.thisMonth')}
            </Text>
            <Badge variant="success" size="sm" label={t('dashboard.onTrack')} />
          </View>
          <Text className="text-4xl text-text dark:text-text-dark" style={{ fontFamily: 'Inter_700Bold' }}>
            $0.00
          </Text>
        </Card>

        <Card variant="filled" padding="lg" className="mt-4">
          <Text className="text-base text-text dark:text-text-dark" style={{ fontFamily: 'Inter_500Medium' }}>
            {t('dashboard.startScanning')}
          </Text>
        </Card>

        <Text className="text-lg text-text dark:text-text-dark mt-8 mb-4" style={{ fontFamily: 'Inter_600SemiBold' }}>
          {t('dashboard.recentReceipts')}
        </Text>

        <Card variant="outlined" padding="md">
          <Text className="text-base text-text dark:text-text-dark" style={{ fontFamily: 'Inter_500Medium' }}>
            {t('dashboard.noReceipts')}
          </Text>
          <Text className="text-sm text-text-secondary dark:text-text-dark-secondary mt-1" style={{ fontFamily: 'Inter_400Regular' }}>
            {t('dashboard.scanFirst')}
          </Text>
        </Card>
      </View>
    </ScrollView>
  );
}

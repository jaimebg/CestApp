import { View, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/src/components/ui';

export default function ScanReviewScreen() {
  const { uri, source } = useLocalSearchParams<{ uri: string; source: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const colors = {
    background: isDark ? '#1A1918' : '#FFFDE1',
    surface: isDark ? '#2D2A26' : '#FFFFFF',
    text: isDark ? '#FFFDE1' : '#2D2A26',
    textSecondary: isDark ? '#B8B4A9' : '#6B6560',
  };

  const handleDone = () => {
    // Navigate back to the scan tab
    router.dismissAll();
  };

  return (
    <View
      className="flex-1"
      style={{ backgroundColor: colors.background, paddingTop: insets.top }}
    >
      <View className="flex-1 justify-center items-center px-6">
        <View className="bg-primary/20 rounded-full p-6 mb-4">
          <Ionicons name="construct-outline" size={48} color="#3D6B23" />
        </View>
        <Text
          className="text-xl text-center"
          style={{ color: colors.text, fontFamily: 'Inter_600SemiBold' }}
        >
          {t('scan.reviewTitle')}
        </Text>
        <Text
          className="text-base text-center mt-2 px-4"
          style={{ color: colors.textSecondary, fontFamily: 'Inter_400Regular' }}
        >
          {t('scan.reviewPlaceholder')}
        </Text>
      </View>

      <View
        className="px-4"
        style={{ paddingBottom: insets.bottom > 0 ? insets.bottom : 16 }}
      >
        <Button variant="primary" size="lg" onPress={handleDone}>
          {t('common.done')}
        </Button>
      </View>
    </View>
  );
}

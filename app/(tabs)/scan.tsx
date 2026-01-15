import { View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/src/components/ui';

export default function ScanScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  return (
    <View
      className="flex-1 bg-background dark:bg-background-dark"
      style={{ paddingTop: insets.top }}
    >
      <View className="flex-1 px-6 pt-4">
        <Text className="text-3xl text-text dark:text-text-dark" style={{ fontFamily: 'Inter_700Bold' }}>
          {t('scan.title')}
        </Text>
        <Text className="text-base text-text-secondary dark:text-text-dark-secondary mt-2" style={{ fontFamily: 'Inter_400Regular' }}>
          {t('scan.subtitle')}
        </Text>

        <View className="flex-1 justify-center gap-4">
          <Pressable className="bg-primary-deep rounded-2xl p-6 flex-row items-center active:bg-primary-dark">
            <View className="bg-white/20 rounded-full p-3 mr-4">
              <Ionicons name="camera-outline" size={28} color="#FFFFFF" />
            </View>
            <View className="flex-1">
              <Text className="text-white text-lg" style={{ fontFamily: 'Inter_600SemiBold' }}>
                {t('scan.takePhoto')}
              </Text>
              <Text className="text-white/80 text-sm mt-1" style={{ fontFamily: 'Inter_400Regular' }}>
                {t('scan.takePhotoDesc')}
              </Text>
            </View>
          </Pressable>

          <Card variant="outlined" padding="lg" onPress={() => {}}>
            <View className="flex-row items-center">
              <View className="bg-primary/20 rounded-full p-3 mr-4">
                <Ionicons name="images-outline" size={28} color="#3D6B23" />
              </View>
              <View className="flex-1">
                <Text className="text-text dark:text-text-dark text-lg" style={{ fontFamily: 'Inter_600SemiBold' }}>
                  {t('scan.fromGallery')}
                </Text>
                <Text className="text-text-secondary dark:text-text-dark-secondary text-sm mt-1" style={{ fontFamily: 'Inter_400Regular' }}>
                  {t('scan.fromGalleryDesc')}
                </Text>
              </View>
            </View>
          </Card>

          <Card variant="outlined" padding="lg" onPress={() => {}}>
            <View className="flex-row items-center">
              <View className="bg-primary/20 rounded-full p-3 mr-4">
                <Ionicons name="document-outline" size={28} color="#3D6B23" />
              </View>
              <View className="flex-1">
                <Text className="text-text dark:text-text-dark text-lg" style={{ fontFamily: 'Inter_600SemiBold' }}>
                  {t('scan.importPdf')}
                </Text>
                <Text className="text-text-secondary dark:text-text-dark-secondary text-sm mt-1" style={{ fontFamily: 'Inter_400Regular' }}>
                  {t('scan.importPdfDesc')}
                </Text>
              </View>
            </View>
          </Card>
        </View>
      </View>
    </View>
  );
}

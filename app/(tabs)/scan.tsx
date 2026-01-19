import { View, Text, Pressable } from 'react-native';
import { showErrorToast } from '@/src/utils/toast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Card } from '@/src/components/ui/Card';
import {
  captureFromCamera,
  selectFromGallery,
  selectPdf,
  CaptureResult,
} from '@/src/services/capture';

export default function ScanScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<'camera' | 'gallery' | 'pdf' | null>(null);

  const handleCaptureResult = (result: CaptureResult) => {
    if (result.success && result.localUri) {
      router.push({
        pathname: '/scan/preview',
        params: { uri: result.localUri, source: result.source },
      });
    } else if (result.error && result.error !== 'cancelled') {
      const errorKey =
        result.error === 'cameraPermission'
          ? 'errors.cameraPermission'
          : result.error === 'galleryPermission'
            ? 'errors.galleryPermission'
            : 'errors.unknownError';

      showErrorToast(t('common.error'), t(errorKey));
    }
  };

  const handleCamera = async () => {
    setIsLoading('camera');
    try {
      const result = await captureFromCamera();
      handleCaptureResult(result);
    } finally {
      setIsLoading(null);
    }
  };

  const handleGallery = async () => {
    setIsLoading('gallery');
    try {
      const result = await selectFromGallery();
      handleCaptureResult(result);
    } finally {
      setIsLoading(null);
    }
  };

  const handlePdf = async () => {
    setIsLoading('pdf');
    try {
      const result = await selectPdf();
      handleCaptureResult(result);
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <View
      className="flex-1 bg-background dark:bg-background-dark"
      style={{ paddingTop: insets.top }}
    >
      <View className="flex-1 px-6 pt-4">
        <Text
          className="text-3xl text-text dark:text-text-dark"
          style={{ fontFamily: 'Inter_700Bold' }}
        >
          {t('scan.title')}
        </Text>
        <Text
          className="text-base text-text-secondary dark:text-text-dark-secondary mt-2"
          style={{ fontFamily: 'Inter_400Regular' }}
        >
          {t('scan.subtitle')}
        </Text>

        <View className="flex-1 justify-center gap-4">
          <Pressable
            className="bg-primary-deep rounded-2xl p-6 flex-row items-center active:bg-primary-dark"
            onPress={handleCamera}
            disabled={isLoading !== null}
            style={{ opacity: isLoading !== null && isLoading !== 'camera' ? 0.5 : 1 }}
          >
            <View className="bg-white/20 rounded-full p-3 mr-4">
              <Ionicons
                name={isLoading === 'camera' ? 'hourglass-outline' : 'camera-outline'}
                size={28}
                color="#FFFFFF"
              />
            </View>
            <View className="flex-1">
              <Text className="text-white text-lg" style={{ fontFamily: 'Inter_600SemiBold' }}>
                {t('scan.takePhoto')}
              </Text>
              <Text
                className="text-white/80 text-sm mt-1"
                style={{ fontFamily: 'Inter_400Regular' }}
              >
                {t('scan.takePhotoDesc')}
              </Text>
            </View>
          </Pressable>

          <Card
            variant="outlined"
            padding="lg"
            onPress={handleGallery}
            disabled={isLoading !== null}
            style={{ opacity: isLoading !== null && isLoading !== 'gallery' ? 0.5 : 1 }}
          >
            <View className="flex-row items-center">
              <View className="bg-primary/20 rounded-full p-3 mr-4">
                <Ionicons
                  name={isLoading === 'gallery' ? 'hourglass-outline' : 'images-outline'}
                  size={28}
                  color="#3D6B23"
                />
              </View>
              <View className="flex-1">
                <Text
                  className="text-text dark:text-text-dark text-lg"
                  style={{ fontFamily: 'Inter_600SemiBold' }}
                >
                  {t('scan.fromGallery')}
                </Text>
                <Text
                  className="text-text-secondary dark:text-text-dark-secondary text-sm mt-1"
                  style={{ fontFamily: 'Inter_400Regular' }}
                >
                  {t('scan.fromGalleryDesc')}
                </Text>
              </View>
            </View>
          </Card>

          <Card
            variant="outlined"
            padding="lg"
            onPress={handlePdf}
            disabled={isLoading !== null}
            style={{ opacity: isLoading !== null && isLoading !== 'pdf' ? 0.5 : 1 }}
          >
            <View className="flex-row items-center">
              <View className="bg-primary/20 rounded-full p-3 mr-4">
                <Ionicons
                  name={isLoading === 'pdf' ? 'hourglass-outline' : 'document-outline'}
                  size={28}
                  color="#3D6B23"
                />
              </View>
              <View className="flex-1">
                <Text
                  className="text-text dark:text-text-dark text-lg"
                  style={{ fontFamily: 'Inter_600SemiBold' }}
                >
                  {t('scan.importPdf')}
                </Text>
                <Text
                  className="text-text-secondary dark:text-text-dark-secondary text-sm mt-1"
                  style={{ fontFamily: 'Inter_400Regular' }}
                >
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

import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { useState } from 'react';
import { deleteReceiptFile, isPdfFile } from '@/src/services/storage';
import { Button } from '@/src/components/ui';

export default function ScanPreviewScreen() {
  const { uri, source } = useLocalSearchParams<{ uri: string; source: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [isProcessing, setIsProcessing] = useState(false);

  const isPdf = uri ? isPdfFile(uri) : false;

  const colors = {
    background: isDark ? '#1A1918' : '#FFFDE1',
    surface: isDark ? '#2D2A26' : '#FFFFFF',
    text: isDark ? '#FFFDE1' : '#2D2A26',
    textSecondary: isDark ? '#B8B4A9' : '#6B6560',
    border: isDark ? '#4A4640' : '#E8E4D9',
  };

  const handleCancel = async () => {
    // Delete the saved file since user cancelled
    if (uri) {
      await deleteReceiptFile(uri);
    }
    router.back();
  };

  const handleProcess = async () => {
    setIsProcessing(true);
    // TODO: Navigate to review screen with OCR processing
    // For now, just simulate a delay
    setTimeout(() => {
      setIsProcessing(false);
      // Will navigate to review screen once OCR is implemented
      router.push({
        pathname: '/scan/review',
        params: { uri, source },
      });
    }, 1000);
  };

  if (!uri) {
    return (
      <View
        className="flex-1 justify-center items-center"
        style={{ backgroundColor: colors.background }}
      >
        <Text style={{ color: colors.text, fontFamily: 'Inter_500Medium' }}>
          {t('errors.loadFailed')}
        </Text>
      </View>
    );
  }

  return (
    <View
      className="flex-1"
      style={{ backgroundColor: colors.background, paddingTop: insets.top }}
    >
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <Pressable
          onPress={handleCancel}
          className="flex-row items-center"
          hitSlop={8}
        >
          <Ionicons name="close" size={24} color={colors.text} />
        </Pressable>
        <Text
          className="text-lg"
          style={{ color: colors.text, fontFamily: 'Inter_600SemiBold' }}
        >
          {t('scan.preview')}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Preview Area */}
      <View className="flex-1 px-4">
        {isPdf ? (
          // PDF Preview
          <View
            className="flex-1 rounded-2xl justify-center items-center"
            style={{ backgroundColor: colors.surface }}
          >
            <View className="bg-primary/20 rounded-full p-6 mb-4">
              <Ionicons name="document" size={64} color="#3D6B23" />
            </View>
            <Text
              className="text-lg text-center"
              style={{ color: colors.text, fontFamily: 'Inter_600SemiBold' }}
            >
              {t('scan.pdfSelected')}
            </Text>
            <Text
              className="text-sm text-center mt-2 px-8"
              style={{ color: colors.textSecondary, fontFamily: 'Inter_400Regular' }}
            >
              {t('scan.pdfReadyToProcess')}
            </Text>
          </View>
        ) : (
          // Image Preview
          <View className="flex-1 rounded-2xl overflow-hidden">
            <Image
              source={{ uri }}
              style={{ flex: 1 }}
              contentFit="contain"
              transition={200}
            />
          </View>
        )}
      </View>

      {/* Source indicator */}
      <View className="px-4 py-2">
        <Text
          className="text-sm text-center"
          style={{ color: colors.textSecondary, fontFamily: 'Inter_400Regular' }}
        >
          {source === 'camera' && t('scan.fromCamera')}
          {source === 'gallery' && t('scan.fromGalleryLabel')}
          {source === 'pdf' && t('scan.fromPdfLabel')}
        </Text>
      </View>

      {/* Action Buttons */}
      <View
        className="px-4 pb-4 gap-3"
        style={{ paddingBottom: insets.bottom > 0 ? insets.bottom : 16 }}
      >
        <Button
          variant="primary"
          size="lg"
          onPress={handleProcess}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <View className="flex-row items-center gap-2">
              <ActivityIndicator color="#FFFFFF" size="small" />
              <Text
                className="text-white"
                style={{ fontFamily: 'Inter_600SemiBold' }}
              >
                {t('scan.processing')}
              </Text>
            </View>
          ) : (
            t('scan.processReceipt')
          )}
        </Button>
        <Button variant="ghost" size="lg" onPress={handleCancel}>
          {t('common.cancel')}
        </Button>
      </View>
    </View>
  );
}

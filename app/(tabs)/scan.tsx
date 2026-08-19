import { View, Text, Pressable } from 'react-native';
import { showErrorToast } from '@/src/utils/toast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Card } from '@/src/components/ui/Card';
import { useAppColors } from '@/src/hooks/useAppColors';
import { selectFromGallery, selectPdf, scanDocument, CaptureResult } from '@/src/services/capture';
import { deleteReceiptFile, isPdfFile } from '@/src/services/storage';
import { processCapture } from '@/src/services/ocr/processCapture';
import { useScanDraftStore } from '@/src/store/scanDraft';

export default function ScanScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<'scanner' | 'gallery' | 'pdf' | null>(null);
  const [isReading, setIsReading] = useState(false);
  const colors = useAppColors();
  const setDraft = useScanDraftStore((state) => state.setDraft);

  // The receipt is read here rather than on a screen of its own: there is
  // nothing to decide over the raw capture, so the flow goes straight to what
  // was read out of it.
  const handleCaptureResult = async (result: CaptureResult) => {
    if (!result.success || !result.localUri) {
      if (result.error && result.error !== 'cancelled') {
        const errorKey =
          result.error === 'galleryPermission' ? 'errors.galleryPermission' : 'errors.unknownError';

        showErrorToast(t('common.error'), t(errorKey));
      }
      return;
    }

    const uri = result.localUri;
    setIsReading(true);

    try {
      const processed = await processCapture({
        uri,
        isPdf: isPdfFile(uri),
        knownDimensions:
          result.width && result.height
            ? { width: result.width, height: result.height }
            : undefined,
      });

      if (!processed.success) {
        await deleteReceiptFile(uri);
        if (processed.error === 'no_text_content') {
          showErrorToast(t('scan.pdfOcrPending'), t('scan.pdfOcrPendingDesc'));
        } else {
          showErrorToast(t('common.error'), t('errors.ocrFailed'));
        }
        return;
      }

      setDraft({
        uri,
        source: result.source,
        isPdf: processed.isPdf,
        ocrText: processed.ocrText,
        lines: processed.lines,
        blocks: processed.blocks,
        dimensions: processed.dimensions,
        zones: processed.zones,
        detectedTotal: processed.detectedTotal,
      });

      router.push('/scan/review');
    } finally {
      setIsReading(false);
    }
  };

  const handleScanDocument = async () => {
    setIsLoading('scanner');
    try {
      const result = await scanDocument();
      await handleCaptureResult(result);
    } finally {
      setIsLoading(null);
    }
  };

  const handleGallery = async () => {
    setIsLoading('gallery');
    try {
      const result = await selectFromGallery();
      await handleCaptureResult(result);
    } finally {
      setIsLoading(null);
    }
  };

  const handlePdf = async () => {
    setIsLoading('pdf');
    try {
      const result = await selectPdf();
      await handleCaptureResult(result);
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
            onPress={handleScanDocument}
            disabled={isLoading !== null}
            accessibilityRole="button"
            accessibilityLabel={t('scan.scanDocument')}
            accessibilityHint={t('scan.scanDocumentDesc')}
            accessibilityState={{ disabled: isLoading !== null, busy: isLoading === 'scanner' }}
            style={{ opacity: isLoading !== null && isLoading !== 'scanner' ? 0.5 : 1 }}
          >
            <View className="bg-white/20 rounded-full p-3 mr-4">
              <Ionicons
                name={isLoading === 'scanner' ? 'hourglass-outline' : 'scan-outline'}
                size={28}
                color="#FFFFFF"
              />
            </View>
            <View className="flex-1">
              <Text className="text-white text-lg" style={{ fontFamily: 'Inter_600SemiBold' }}>
                {t('scan.scanDocument')}
              </Text>
              <Text
                className="text-white/80 text-sm mt-1"
                style={{ fontFamily: 'Inter_400Regular' }}
              >
                {isReading && isLoading === 'scanner'
                  ? t('scan.analyzing')
                  : t('scan.scanDocumentDesc')}
              </Text>
            </View>
          </Pressable>

          <Card
            variant="outlined"
            padding="lg"
            onPress={handleGallery}
            disabled={isLoading !== null}
            accessibilityLabel={t('scan.fromGallery')}
            accessibilityHint={t('scan.fromGalleryDesc')}
            style={{ opacity: isLoading !== null && isLoading !== 'gallery' ? 0.5 : 1 }}
          >
            <View className="flex-row items-center">
              <View className="bg-primary/20 rounded-full p-3 mr-4">
                <Ionicons
                  name={isLoading === 'gallery' ? 'hourglass-outline' : 'images-outline'}
                  size={28}
                  color={colors.action}
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
                  {isReading && isLoading === 'gallery'
                    ? t('scan.analyzing')
                    : t('scan.fromGalleryDesc')}
                </Text>
              </View>
            </View>
          </Card>

          <Card
            variant="outlined"
            padding="lg"
            onPress={handlePdf}
            disabled={isLoading !== null}
            accessibilityLabel={t('scan.importPdf')}
            accessibilityHint={t('scan.importPdfDesc')}
            style={{ opacity: isLoading !== null && isLoading !== 'pdf' ? 0.5 : 1 }}
          >
            <View className="flex-row items-center">
              <View className="bg-primary/20 rounded-full p-3 mr-4">
                <Ionicons
                  name={isLoading === 'pdf' ? 'hourglass-outline' : 'document-outline'}
                  size={28}
                  color={colors.action}
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
                  {isReading && isLoading === 'pdf' ? t('scan.analyzing') : t('scan.importPdfDesc')}
                </Text>
              </View>
            </View>
          </Card>
        </View>
      </View>
    </View>
  );
}

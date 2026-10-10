import { useMemo, useState } from 'react';
import { View, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { ModalHeader } from '@/src/components/ui/ModalHeader';
import { Button } from '@/src/components/ui/Button';
import { ReadingColumn } from '@/src/components/ui/ReadingColumn';
import { ReceiptCropCanvas } from '@/src/components/zones/ReceiptCropCanvas';
import { useAppColors } from '@/src/hooks/useAppColors';
import { useScanDraftStore } from '@/src/store/scanDraft';
import { processCapture } from '@/src/services/ocr/processCapture';
import { autoDetectZones } from '@/src/services/ocr/autoZoneDetector';
import { isPdfFile } from '@/src/services/storage';
import { showErrorToast } from '@/src/utils/toast';
import { createScopedLogger } from '@/src/utils/debug';
import type { NormalizedBoundingBox } from '@/src/types/zones';

const logger = createScopedLogger('Crop');

/** Below this fraction of either axis, a drag is a mis-tap, not a crop. */
const MIN_CROP_FRACTION = 0.05;

const DEFAULT_DIMENSIONS = { width: 1000, height: 1500 };

export default function ReceiptCropScreen() {
  const { uri, imageDimensions } = useLocalSearchParams<{
    uri: string;
    imageDimensions?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const colors = useAppColors();
  const setDraft = useScanDraftStore((state) => state.setDraft);

  const parsedDimensions = useMemo(() => {
    if (!imageDimensions) return DEFAULT_DIMENSIONS;
    try {
      return JSON.parse(imageDimensions) as { width: number; height: number };
    } catch (error) {
      logger.error('Malformed imageDimensions param:', error);
      return DEFAULT_DIMENSIONS;
    }
  }, [imageDimensions]);

  const [crop, setCrop] = useState<NormalizedBoundingBox | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const hasValidCrop =
    crop !== null && crop.width >= MIN_CROP_FRACTION && crop.height >= MIN_CROP_FRACTION;

  const handleConfirm = async () => {
    if (!hasValidCrop || !crop || !uri) return;

    setIsProcessing(true);
    try {
      const processed = await processCapture({
        uri,
        isPdf: false,
        knownDimensions: parsedDimensions,
      });
      if (!processed.success) {
        showErrorToast(t('common.error'), t('errors.ocrFailed'));
        return;
      }

      // Keep the blocks whose centre falls inside the drawn rectangle.
      // Coordinates stay in the recognizer's space — the saved image is never
      // re-encoded.
      const { width, height } = processed.dimensions;
      const inside = processed.blocks.filter((b) => {
        const cx = (b.boundingBox.left + b.boundingBox.width / 2) / width;
        const cy = (b.boundingBox.top + b.boundingBox.height / 2) / height;
        return (
          cx >= crop.x && cx <= crop.x + crop.width && cy >= crop.y && cy <= crop.y + crop.height
        );
      });

      if (inside.length === 0) {
        showErrorToast(t('common.error'), t('scan.noTextDetectedDesc'));
        return;
      }

      const detected = autoDetectZones(inside, processed.dimensions);

      setDraft({
        uri,
        source: useScanDraftStore.getState().draft?.source ?? 'gallery',
        isPdf: false,
        ocrText: processed.ocrText,
        lines: inside.map((b) => b.text),
        blocks: inside,
        dimensions: processed.dimensions,
        zones: detected.zones,
        detectedTotal: detected.detectedTotal,
      });
      router.back();
    } catch (error) {
      logger.error('Crop failed:', error);
      showErrorToast(t('common.error'), t('errors.ocrFailed'));
    } finally {
      setIsProcessing(false);
    }
  };

  if (!uri || isPdfFile(uri)) {
    return (
      <View
        className="flex-1 justify-center items-center px-6"
        style={{ backgroundColor: colors.background }}
      >
        <Ionicons
          name={!uri ? 'alert-circle' : 'document-text-outline'}
          size={48}
          color={colors.textSecondary}
        />
        <Text
          className="text-base mt-4 text-center"
          style={{ color: colors.text, fontFamily: 'Inter_500Medium' }}
        >
          {!uri ? t('errors.loadFailed') : t('scan.zonesPdfUnsupported')}
        </Text>
        <View className="mt-6 w-48">
          <Button variant="primary" size="md" onPress={() => router.back()}>
            {t('common.back')}
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background, paddingTop: insets.top }}>
      <ModalHeader title={t('scan.cropTitle')} onClose={() => router.back()} />

      <View style={{ backgroundColor: colors.surface }}>
        <ReadingColumn className="px-4 py-2">
          <Text
            className="text-xs text-center"
            style={{ color: colors.textSecondary, fontFamily: 'Inter_400Regular' }}
          >
            {t('scan.cropInstructions')}
          </Text>
        </ReadingColumn>
      </View>

      <View className="flex-1">
        <ReceiptCropCanvas
          imageUri={uri}
          imageDimensions={parsedDimensions}
          crop={crop}
          onCropChange={setCrop}
        />
      </View>

      <View className="px-4" style={{ paddingBottom: insets.bottom + 16 }}>
        <ReadingColumn>
          <Button
            variant="primary"
            size="lg"
            onPress={handleConfirm}
            disabled={!hasValidCrop}
            loading={isProcessing}
          >
            {t('scan.cropIt')}
          </Button>
        </ReadingColumn>
      </View>
    </View>
  );
}

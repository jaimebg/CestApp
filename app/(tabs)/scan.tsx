import { View, Text } from 'react-native';
import { showErrorToast } from '@/src/utils/toast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Button } from '@/src/components/ui/Button';
import { ListGroup, ListRow } from '@/src/components/ui/ListGroup';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { fonts } from '@/src/theme/type';
import { ReadingColumn } from '@/src/components/ui/ReadingColumn';
import { useAppColors } from '@/src/hooks/useAppColors';
import { selectFromGallery, selectPdf, scanDocument, CaptureResult } from '@/src/services/capture';
import { deleteReceiptFile, isPdfFile } from '@/src/services/storage';
import { processCapture } from '@/src/services/ocr/processCapture';
import { useScanDraftStore } from '@/src/store/scanDraft';
import { hapticSelection } from '@/src/utils/haptics';

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
        source: result.source,
        knownDimensions:
          result.width && result.height
            ? { width: result.width, height: result.height }
            : undefined,
      });

      if (!processed.success) {
        await deleteReceiptFile(uri);
        if (processed.error === 'no_text_content') {
          showErrorToast(t('common.error'), t('scan.pdfOcrPendingDesc'));
        } else {
          showErrorToast(t('common.error'), t('errors.ocrFailed'));
        }
        handleManualEntry();
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
    void hapticSelection();
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

  const handleManualEntry = () => {
    setDraft({
      uri: '',
      source: 'manual',
      isPdf: false,
      ocrText: '',
      lines: [],
      blocks: [],
      dimensions: { width: 1000, height: 1500 },
      zones: [],
      detectedTotal: null,
    });
    router.push('/scan/review');
  };

  const busy = isLoading !== null;
  const describe = (source: 'gallery' | 'pdf', idle: string) =>
    isReading && isLoading === source ? t('scan.analyzing') : idle;

  return (
    <View
      className="flex-1 bg-background dark:bg-background-dark"
      style={{ paddingTop: insets.top }}
    >
      <ReadingColumn className="flex-1">
        <ScreenHeader title={t('scan.title')} />

        <View className="px-5 mt-4">
          <Button
            size="lg"
            onPress={handleScanDocument}
            loading={isLoading === 'scanner'}
            disabled={busy}
            accessibilityHint={t('scan.scanDocumentDesc')}
            leftIcon={<Ionicons name="scan-outline" size={20} color="#FFFFFF" />}
          >
            {t('scan.scanDocument')}
          </Button>
          <Text
            style={{
              fontFamily: fonts.regular,
              fontSize: 13,
              lineHeight: 18,
              color: colors.textSecondary,
              textAlign: 'center',
              marginTop: 8,
            }}
          >
            {isReading && isLoading === 'scanner'
              ? t('scan.analyzing')
              : t('scan.scanDocumentDesc')}
          </Text>
        </View>

        <View className="px-5 mt-8">
          <ListGroup>
            <ListRow
              title={t('scan.fromGallery')}
              description={describe('gallery', t('scan.fromGalleryDesc'))}
              icon={isLoading === 'gallery' ? 'hourglass-outline' : 'images-outline'}
              chevron
              disabled={busy}
              onPress={handleGallery}
            />
            <ListRow
              title={t('scan.importPdf')}
              description={describe('pdf', t('scan.importPdfDesc'))}
              icon={isLoading === 'pdf' ? 'hourglass-outline' : 'document-outline'}
              chevron
              disabled={busy}
              onPress={handlePdf}
            />
            <ListRow
              title={t('scan.addManually')}
              description={t('scan.addManuallyDesc')}
              icon="create-outline"
              chevron
              disabled={busy}
              onPress={handleManualEntry}
            />
          </ListGroup>
        </View>
      </ReadingColumn>
    </View>
  );
}

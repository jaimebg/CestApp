import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Image as RNImage,
  useWindowDimensions,
} from 'react-native';
import { showErrorToast } from '@/src/utils/toast';
import { createScopedLogger } from '@/src/utils/debug';
import { Image } from 'expo-image';
import Svg, { Rect } from 'react-native-svg';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect, useRef } from 'react';
import { deleteReceiptFile, isPdfFile } from '@/src/services/storage';
import { recognizeText, OcrBlock } from '@/src/services/ocr';
import { extractTextFromPdf } from '@/src/services/pdf';
import { autoDetectZones } from '@/src/services/ocr/autoZoneDetector';
import { Button } from '@/src/components/ui/Button';
import { ZONE_COLORS, type ZoneDefinition } from '@/src/types/zones';
import { useAppColors } from '@/src/hooks/useAppColors';
import Pdf from 'react-native-pdf';

const logger = createScopedLogger('Preview');

async function getImageDimensions(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    RNImage.getSize(
      uri,
      (width, height) => {
        logger.log('getImageDimensions success:', {
          width,
          height,
          uri: uri.substring(0, 50),
        });
        resolve({ width, height });
      },
      (error) => {
        // Fallback if getSize fails
        logger.log('getImageDimensions FAILED, using fallback:', error);
        resolve({ width: 1000, height: 1500 });
      }
    );
  });
}

export default function ScanPreviewScreen() {
  const {
    uri,
    source,
    definedZones: definedZonesParam,
    imageDimensions: imageDimensionsParam,
  } = useLocalSearchParams<{
    uri: string;
    source: string;
    definedZones?: string;
    imageDimensions?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const colors = useAppColors();
  const { width: screenWidth } = useWindowDimensions();

  const [isProcessing, setIsProcessing] = useState(false);
  const [isDetectingZones, setIsDetectingZones] = useState(false);
  const [zones, setZones] = useState<ZoneDefinition[]>([]);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(
    imageDimensionsParam ? JSON.parse(imageDimensionsParam) : null
  );

  // Store OCR results for reuse when processing
  const [ocrResult, setOcrResult] = useState<{
    text: string;
    lines: string[];
    blocks: OcrBlock[];
    inferredDimensions: { width: number; height: number } | null;
  } | null>(null);

  // Store detected total from auto zone detection (bypasses zone transformation issues)
  const [detectedTotal, setDetectedTotal] = useState<number | null>(null);

  const hasAutoDetected = useRef(false);
  const isPdf = uri ? isPdfFile(uri) : false;

  // Parse defined zones from params (returned from zones screen)
  useEffect(() => {
    logger.log('definedZonesParam received:', definedZonesParam ? 'yes' : 'no');
    if (definedZonesParam) {
      try {
        const parsedZones = JSON.parse(definedZonesParam) as ZoneDefinition[];
        logger.log('Parsed zones from zones screen:', parsedZones.length);
        parsedZones.forEach((z, i) => {
          logger.log(`Zone ${i}: type=${z.type}, bbox=${JSON.stringify(z.boundingBox)}`);
        });
        setZones(parsedZones);
      } catch (e) {
        logger.error('Error parsing defined zones:', e);
      }
    }
  }, [definedZonesParam]);

  // Get image dimensions on mount
  useEffect(() => {
    if (!isPdf && uri && !dimensions) {
      getImageDimensions(uri).then(setDimensions);
    }
  }, [uri, isPdf, dimensions]);

  // Auto-detect zones when image loads (if no zones defined)
  useEffect(() => {
    async function runAutoDetection() {
      // Skip if already detecting, already have zones, or no URI
      if (hasAutoDetected.current || zones.length > 0 || !uri || isPdf || isDetectingZones) {
        return;
      }

      hasAutoDetected.current = true;
      setIsDetectingZones(true);
      logger.log('Starting auto zone detection...');

      try {
        // Get actual image dimensions first, then pass to OCR for accurate zone alignment
        const imageDims = dimensions || (await getImageDimensions(uri));
        if (!dimensions) setDimensions(imageDims);

        const result = await recognizeText(uri, imageDims);

        if (result.success && result.blocks.length > 0) {
          setOcrResult({
            text: result.text,
            lines: result.lines,
            blocks: result.blocks,
            inferredDimensions: result.inferredDimensions || null,
          });

          const effectiveDims = result.inferredDimensions || imageDims;

          logger.log('OCR completed:', result.blocks.length, 'blocks');
          logger.log('Using dimensions for auto-detection:', effectiveDims);

          // Auto-detect zones from OCR blocks
          const detected = autoDetectZones(result.blocks, effectiveDims);
          logger.log('Auto-detected zones:', detected.zones.length);
          logger.log('Detection confidence:', detected.confidence);
          logger.log('Detected total:', detected.detectedTotal);

          if (detected.zones.length > 0) {
            setZones(detected.zones);
          }
          if (detected.detectedTotal !== null) {
            setDetectedTotal(detected.detectedTotal);
          }
        } else {
          logger.log('OCR failed or no blocks found');
        }
      } catch (error) {
        logger.error('Auto-detection error:', error);
      } finally {
        setIsDetectingZones(false);
      }
    }

    runAutoDetection();
  }, [uri, isPdf, dimensions, zones.length, isDetectingZones]);

  const handleCancel = async () => {
    if (uri) {
      await deleteReceiptFile(uri);
    }
    router.back();
  };

  const handleDefineZones = async () => {
    // Get dimensions if not already available
    let dims = dimensions;
    if (!dims && uri && !isPdf) {
      dims = await getImageDimensions(uri);
      setDimensions(dims);
    }

    logger.log('Going to zones with dimensions:', dims);
    logger.log('Passing existing zones:', zones.length);
    router.push({
      pathname: '/scan/zones',
      params: {
        uri,
        source,
        mode: 'preview',
        imageDimensions: dims ? JSON.stringify(dims) : undefined,
        // Pass existing zones (auto-detected or manually modified)
        existingZones: zones.length > 0 ? JSON.stringify(zones) : undefined,
      },
    });
  };

  const handleProcess = async () => {
    if (!uri) return;

    setIsProcessing(true);

    try {
      if (isPdf) {
        const result = await extractTextFromPdf(uri);

        if (result.success && result.text.length > 0) {
          router.push({
            pathname: '/scan/review',
            params: {
              uri,
              source,
              ocrText: result.text,
              ocrLines: JSON.stringify(result.lines),
              isPdf: 'true',
              // Pass zones if defined (for PDF manual zone parsing)
              ...(zones.length > 0 && { manualZones: JSON.stringify(zones) }),
            },
          });
        } else if (result.error === 'no_text_content') {
          showErrorToast(t('scan.pdfOcrPending'), t('scan.pdfOcrPendingDesc'));
        } else {
          showErrorToast(t('common.error'), t('errors.ocrFailed'));
        }
      } else {
        // Use cached OCR result if available, otherwise run OCR
        const imageDims = dimensions || (await getImageDimensions(uri));
        let result = ocrResult;
        if (!result) {
          logger.log('Running OCR (no cached result)...');
          const ocrResponse = await recognizeText(uri, imageDims);
          if (ocrResponse.success) {
            result = {
              text: ocrResponse.text,
              lines: ocrResponse.lines,
              blocks: ocrResponse.blocks,
              inferredDimensions: ocrResponse.inferredDimensions || null,
            };
          } else {
            showErrorToast(t('common.error'), t('errors.ocrFailed'));
            return;
          }
        } else {
          logger.log('Using cached OCR result');
        }

        const effectiveDims = result.inferredDimensions || imageDims;

        logger.log('Processing image with:');
        logger.log('- getImageDimensions:', imageDims);
        logger.log('- Using effectiveDims:', effectiveDims);
        logger.log('- Zones:', zones.length);
        logger.log('- Blocks from OCR:', result.blocks.length);
        if (result.blocks.length > 0) {
          logger.log('- First block bbox:', result.blocks[0].boundingBox);
        }

        router.push({
          pathname: '/scan/review',
          params: {
            uri,
            source,
            ocrText: result.text,
            ocrLines: JSON.stringify(result.lines),
            ocrBlocks: JSON.stringify(result.blocks),
            imageDimensions: JSON.stringify(effectiveDims),
            // Also pass original dimensions for zone scaling if needed
            originalImageDimensions: JSON.stringify(imageDims),
            // Pass zones if detected (auto or manual) - hybrid parser will use them to refine results
            ...(zones.length > 0 && { manualZones: JSON.stringify(zones) }),
            // Pass detected total from auto zone detection (bypasses zone transformation issues)
            ...(detectedTotal !== null && { detectedTotal: detectedTotal.toString() }),
          },
        });
      }
    } catch (error) {
      logger.error('Processing error:', error);
      showErrorToast(t('common.error'), t('errors.ocrFailed'));
    } finally {
      setIsProcessing(false);
    }
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
    <View className="flex-1" style={{ backgroundColor: colors.background, paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <Pressable onPress={handleCancel} className="flex-row items-center" hitSlop={8}>
          <Ionicons name="close" size={24} color={colors.text} />
        </Pressable>
        <Text className="text-lg" style={{ color: colors.text, fontFamily: 'Inter_600SemiBold' }}>
          {t('scan.preview')}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Preview Area */}
      <View className="flex-1 px-4">
        {isPdf ? (
          <View
            className="flex-1 rounded-2xl overflow-hidden"
            style={{ backgroundColor: colors.surface }}
          >
            <Pdf
              source={{ uri }}
              style={{ flex: 1, backgroundColor: colors.surface }}
              enablePaging={true}
              horizontal={false}
              fitPolicy={0}
              spacing={0}
              onLoadComplete={(numberOfPages) => {
                logger.log(`PDF loaded with ${numberOfPages} pages`);
              }}
              onError={(error) => {
                logger.error('PDF error:', error);
                showErrorToast(t('common.error'), t('scan.pdfLoadError'));
              }}
              trustAllCerts={false}
              renderActivityIndicator={() => (
                <View className="flex-1 justify-center items-center">
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text
                    className="text-sm mt-3"
                    style={{ color: colors.textSecondary, fontFamily: 'Inter_400Regular' }}
                  >
                    {t('scan.loadingPdf')}
                  </Text>
                </View>
              )}
            />
          </View>
        ) : (
          <View className="flex-1 rounded-2xl overflow-hidden items-center justify-center">
            {/* Image with zones overlay - uses same sizing as ZoneSelectionCanvas */}
            {(() => {
              const displayWidth = screenWidth - 32;
              const aspectRatio = dimensions ? dimensions.width / dimensions.height : 1.5;
              const displayHeight = displayWidth / aspectRatio;

              return (
                <View style={{ width: displayWidth, height: displayHeight }}>
                  <Image
                    source={{ uri }}
                    style={{ width: displayWidth, height: displayHeight }}
                    contentFit="fill"
                    transition={200}
                  />
                  {/* Zones overlay */}
                  {zones.length > 0 && (
                    <Svg
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: displayWidth,
                        height: displayHeight,
                      }}
                    >
                      {zones.map((zone) => (
                        <Rect
                          key={zone.id}
                          x={zone.boundingBox.x * displayWidth}
                          y={zone.boundingBox.y * displayHeight}
                          width={zone.boundingBox.width * displayWidth}
                          height={zone.boundingBox.height * displayHeight}
                          fill={`${ZONE_COLORS[zone.type]}40`}
                          stroke={ZONE_COLORS[zone.type]}
                          strokeWidth={2}
                        />
                      ))}
                    </Svg>
                  )}
                </View>
              );
            })()}
          </View>
        )}
      </View>

      {/* Zones indicator and button */}
      {!isPdf && (
        <View className="px-4 py-2">
          {isDetectingZones ? (
            <View
              className="flex-row items-center justify-center py-3 rounded-xl"
              style={{ backgroundColor: colors.surface }}
            >
              <ActivityIndicator size="small" color={colors.primary} />
              <Text
                className="text-sm ml-2"
                style={{
                  color: colors.textSecondary,
                  fontFamily: 'Inter_500Medium',
                }}
              >
                {t('scan.detectingZones')}
              </Text>
            </View>
          ) : (
            <Pressable
              onPress={handleDefineZones}
              className="flex-row items-center justify-center py-3 rounded-xl"
              style={{ backgroundColor: zones.length > 0 ? colors.primary + '20' : colors.surface }}
            >
              <Ionicons
                name={zones.length > 0 ? 'checkmark-circle' : 'grid-outline'}
                size={20}
                color={zones.length > 0 ? colors.primary : colors.textSecondary}
              />
              <Text
                className="text-sm ml-2"
                style={{
                  color: zones.length > 0 ? colors.primary : colors.textSecondary,
                  fontFamily: 'Inter_500Medium',
                }}
              >
                {zones.length > 0
                  ? `${zones.length} ${t('scan.zonesDetected')} - ${t('scan.tapToEdit')}`
                  : t('scan.defineParsingZones')}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={zones.length > 0 ? colors.primary : colors.textSecondary}
                style={{ marginLeft: 4 }}
              />
            </Pressable>
          )}
        </View>
      )}

      {/* Source indicator */}
      <View className="px-4 py-2">
        <Text
          className="text-sm text-center"
          style={{ color: colors.textSecondary, fontFamily: 'Inter_400Regular' }}
        >
          {source === 'camera' && t('scan.fromCamera')}
          {source === 'scanner' && t('scan.fromScanner')}
          {source === 'gallery' && t('scan.fromGalleryLabel')}
          {source === 'pdf' && t('scan.fromPdfLabel')}
        </Text>
      </View>

      {/* Action Buttons */}
      <View
        className="px-4 pb-4 gap-3"
        style={{ paddingBottom: insets.bottom > 0 ? insets.bottom : 16 }}
      >
        <Button variant="primary" size="lg" onPress={handleProcess} disabled={isProcessing}>
          {isProcessing ? (
            <View className="flex-row items-center gap-2">
              <ActivityIndicator color="#FFFFFF" size="small" />
              <Text className="text-white" style={{ fontFamily: 'Inter_600SemiBold' }}>
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

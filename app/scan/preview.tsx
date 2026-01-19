import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  useColorScheme,
  Image as RNImage,
  useWindowDimensions,
} from 'react-native';
import { showErrorToast } from '@/src/utils/toast';
import { Image } from 'expo-image';
import Svg, { Rect } from 'react-native-svg';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { deleteReceiptFile, isPdfFile } from '@/src/services/storage';
import { recognizeText } from '@/src/services/ocr';
import { extractTextFromPdf } from '@/src/services/pdf';
import { Button } from '@/src/components/ui';
import { ZONE_COLORS, type ZoneDefinition } from '@/src/types/zones';
import Pdf from 'react-native-pdf';

async function getImageDimensions(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    RNImage.getSize(
      uri,
      (width, height) => {
        resolve({ width, height });
      },
      () => {
        // Fallback if getSize fails
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
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { width: screenWidth } = useWindowDimensions();

  const [isProcessing, setIsProcessing] = useState(false);
  const [zones, setZones] = useState<ZoneDefinition[]>([]);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(
    imageDimensionsParam ? JSON.parse(imageDimensionsParam) : null
  );

  const isPdf = uri ? isPdfFile(uri) : false;

  // Parse defined zones from params (returned from zones screen)
  useEffect(() => {
    console.log('[Preview] definedZonesParam received:', definedZonesParam ? 'yes' : 'no');
    if (definedZonesParam) {
      try {
        const parsedZones = JSON.parse(definedZonesParam) as ZoneDefinition[];
        console.log('[Preview] Parsed zones:', parsedZones.length);
        parsedZones.forEach((z, i) => {
          console.log(`[Preview] Zone ${i}: type=${z.type}, bbox=${JSON.stringify(z.boundingBox)}`);
        });
        setZones(parsedZones);
      } catch (e) {
        console.error('[Preview] Error parsing defined zones:', e);
      }
    }
  }, [definedZonesParam]);

  // Get image dimensions on mount
  useEffect(() => {
    if (!isPdf && uri && !dimensions) {
      getImageDimensions(uri).then(setDimensions);
    }
  }, [uri, isPdf, dimensions]);

  const colors = {
    background: isDark ? '#1A1918' : '#FFFDE1',
    surface: isDark ? '#2D2A26' : '#FFFFFF',
    text: isDark ? '#FFFDE1' : '#2D2A26',
    textSecondary: isDark ? '#B8B4A9' : '#6B6560',
    border: isDark ? '#4A4640' : '#E8E4D9',
    primary: '#93BD57',
  };

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

    console.log('[Preview] Going to zones with dimensions:', dims);
    router.push({
      pathname: '/scan/zones',
      params: {
        uri,
        source,
        mode: 'preview',
        imageDimensions: dims ? JSON.stringify(dims) : undefined,
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
        const result = await recognizeText(uri);

        if (result.success) {
          const imageDims = dimensions || (await getImageDimensions(uri));
          console.log('[Preview] Processing image with:');
          console.log('[Preview] - Dimensions:', imageDims);
          console.log('[Preview] - Zones:', zones.length);
          console.log('[Preview] - Blocks from OCR:', result.blocks.length);
          if (result.blocks.length > 0) {
            console.log('[Preview] - First block bbox:', result.blocks[0].boundingBox);
          }
          router.push({
            pathname: '/scan/review',
            params: {
              uri,
              source,
              ocrText: result.text,
              ocrLines: JSON.stringify(result.lines),
              ocrBlocks: JSON.stringify(result.blocks),
              imageDimensions: JSON.stringify(imageDims),
              // Pass zones if defined
              ...(zones.length > 0 && { manualZones: JSON.stringify(zones) }),
            },
          });
        } else {
          showErrorToast(t('common.error'), t('errors.ocrFailed'));
        }
      }
    } catch (error) {
      console.error('Processing error:', error);
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
                console.log(`[Preview] PDF loaded with ${numberOfPages} pages`);
              }}
              onError={(error) => {
                console.error('[Preview] PDF error:', error);
                showErrorToast(t('common.error'), t('scan.pdfLoadError'));
              }}
              trustAllCerts={false}
              activityIndicator={
                <View className="flex-1 justify-center items-center">
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text
                    className="text-sm mt-3"
                    style={{ color: colors.textSecondary, fontFamily: 'Inter_400Regular' }}
                  >
                    {t('scan.loadingPdf')}
                  </Text>
                </View>
              }
            />
          </View>
        ) : (
          <View className="flex-1 rounded-2xl overflow-hidden">
            {/* Image with zones overlay */}
            <View
              className="flex-1"
              onLayout={(e) => {
                // We can use this for overlay sizing if needed
              }}
            >
              <Image source={{ uri }} style={{ flex: 1 }} contentFit="contain" transition={200} />
              {/* Zones overlay */}
              {zones.length > 0 && dimensions && (
                <View
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  {(() => {
                    const containerWidth = screenWidth - 32; // px-4 on each side
                    const imageAspectRatio = dimensions.width / dimensions.height;
                    // Approximate - assume container is roughly square-ish for preview
                    // The actual fit is "contain" so we need to calculate
                    const maxHeight = 500; // approximate max container height
                    let previewWidth = containerWidth;
                    let previewHeight = containerWidth / imageAspectRatio;
                    if (previewHeight > maxHeight) {
                      previewHeight = maxHeight;
                      previewWidth = maxHeight * imageAspectRatio;
                    }
                    return (
                      <Svg width={previewWidth} height={previewHeight}>
                        {zones.map((zone) => (
                          <Rect
                            key={zone.id}
                            x={zone.boundingBox.x * previewWidth}
                            y={zone.boundingBox.y * previewHeight}
                            width={zone.boundingBox.width * previewWidth}
                            height={zone.boundingBox.height * previewHeight}
                            fill={`${ZONE_COLORS[zone.type]}40`}
                            stroke={ZONE_COLORS[zone.type]}
                            strokeWidth={2}
                          />
                        ))}
                      </Svg>
                    );
                  })()}
                </View>
              )}
            </View>
          </View>
        )}
      </View>

      {/* Zones indicator and button */}
      {!isPdf && (
        <View className="px-4 py-2">
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
                ? `${zones.length} ${t('scan.zonesDefined')}`
                : t('scan.defineParsingZones')}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={zones.length > 0 ? colors.primary : colors.textSecondary}
              style={{ marginLeft: 4 }}
            />
          </Pressable>
        </View>
      )}

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

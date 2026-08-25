/**
 * What the scanner read off the receipt: the zones it found, drawn over the
 * receipt itself, and the text it recognized. The zones can be redrawn from
 * here when the reading came out wrong.
 */

import { useState } from 'react';
import { View, Text, ScrollView, Modal, Platform, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import Svg, { Rect } from 'react-native-svg';
import Pdf from 'react-native-pdf';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ModalHeader } from '../../ui/ModalHeader';
import { Button } from '../../ui/Button';
import { ReadingColumn } from '../../ui/ReadingColumn';
import { fitInBox, READING_MAX } from '../../../theme/layout';
import { ZONE_COLORS, ZONE_LABELS, type ZoneDefinition, type ZoneType } from '@/src/types/zones';
import type { ReviewColors } from '../types';

interface ReadingModalProps {
  visible: boolean;
  onClose: () => void;
  zones: ZoneDefinition[];
  imageUri: string | null;
  isPdf: boolean;
  dimensions: { width: number; height: number };
  lines: string[];
  /** Absent where zones cannot be redrawn, as on a PDF page. */
  onEditZones: (() => void) | null;
  colors: ReviewColors;
}

export function ReadingModal({
  visible,
  onClose,
  zones,
  imageUri,
  isPdf,
  dimensions,
  lines,
  onEditZones,
  colors,
}: ReadingModalProps) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const [showText, setShowText] = useState(false);
  const [viewport, setViewport] = useState<{ width: number; height: number } | null>(null);

  const language = i18n.language.startsWith('es') ? 'es' : 'en';
  const aspectRatio =
    dimensions.width > 0 && dimensions.height > 0 ? dimensions.width / dimensions.height : 1.5;
  const preview = viewport
    ? fitInBox({
        aspect: aspectRatio,
        maxWidth: Math.min(viewport.width, READING_MAX) - 32,
        /** Leave room for the zone-type legend and the text toggle below. */
        maxHeight: viewport.height * 0.72,
      })
    : null;

  // One entry per kind of zone: a receipt has many product rows but one
  // meaning for them.
  const zoneTypes = Array.from(new Set(zones.map((zone) => zone.type))) as ZoneType[];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View
        className="flex-1"
        style={{
          backgroundColor: colors.background,
          paddingTop: Platform.OS === 'ios' ? 0 : insets.top,
          paddingBottom: insets.bottom,
        }}
      >
        <ModalHeader title={t('scan.readingTitle')} onClose={onClose} />

        <ScrollView
          className="flex-1 p-4"
          onLayout={(event) => {
            const { width, height } = event.nativeEvent.layout;
            setViewport({ width, height });
          }}
        >
          <ReadingColumn>
            {imageUri && preview && (
              <View className="items-center">
                {/* The receipt is shown in the geometry the zones were read in, so
                  a zone lands where the scanner placed it. */}
                <View
                  style={{ width: preview.width, height: preview.height }}
                  className="rounded-2xl overflow-hidden"
                >
                  {isPdf ? (
                    <Pdf
                      source={{ uri: imageUri }}
                      style={{ flex: 1, backgroundColor: colors.surface }}
                      fitPolicy={2}
                      spacing={0}
                      enablePaging
                      trustAllCerts={false}
                    />
                  ) : (
                    <Image
                      source={{ uri: imageUri }}
                      style={{ width: preview.width, height: preview.height }}
                      contentFit="fill"
                    />
                  )}
                  <Svg
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: preview.width,
                      height: preview.height,
                    }}
                  >
                    {zones.map((zone) => (
                      <Rect
                        key={zone.id}
                        x={zone.boundingBox.x * preview.width}
                        y={zone.boundingBox.y * preview.height}
                        width={zone.boundingBox.width * preview.width}
                        height={zone.boundingBox.height * preview.height}
                        fill={`${ZONE_COLORS[zone.type]}40`}
                        stroke={ZONE_COLORS[zone.type]}
                        strokeWidth={2}
                      />
                    ))}
                  </Svg>
                </View>
              </View>
            )}

            {zoneTypes.length > 0 && (
              <View className="mt-4">
                <Text
                  className="text-sm mb-3"
                  style={{ color: colors.text, fontFamily: 'Inter_600SemiBold' }}
                >
                  {t('scan.zoneTypes')}
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {zoneTypes.map((type) => (
                    <View
                      key={type}
                      className="flex-row items-center px-3 py-1.5 rounded-full"
                      style={{ backgroundColor: colors.surface }}
                    >
                      <View
                        className="w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: ZONE_COLORS[type] }}
                      />
                      <Text
                        className="text-sm"
                        style={{ color: colors.text, fontFamily: 'Inter_400Regular' }}
                      >
                        {ZONE_LABELS[type][language]}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <Pressable
              onPress={() => setShowText(!showText)}
              className="flex-row items-center justify-center py-3 mt-4"
              accessibilityRole="button"
              accessibilityState={{ expanded: showText }}
            >
              <Ionicons
                name={showText ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={colors.textSecondary}
              />
              <Text
                className="text-sm ml-1"
                style={{ color: colors.textSecondary, fontFamily: 'Inter_400Regular' }}
              >
                {showText ? t('scan.hideRawText') : t('scan.showRawText')}
              </Text>
            </Pressable>

            {showText && (
              <View className="rounded-2xl p-4 mb-4" style={{ backgroundColor: colors.surface }}>
                {lines.map((line, index) => (
                  <Text
                    key={index}
                    className="text-xs mb-0.5"
                    style={{ color: colors.text, fontFamily: 'Inter_400Regular', lineHeight: 16 }}
                  >
                    {line}
                  </Text>
                ))}
              </View>
            )}
          </ReadingColumn>
        </ScrollView>

        {onEditZones && (
          <View className="px-4 pb-2">
            <ReadingColumn>
              <Button variant="secondary" size="lg" onPress={onEditZones}>
                {t('scan.editZones')}
              </Button>
            </ReadingColumn>
          </View>
        )}
      </View>
    </Modal>
  );
}

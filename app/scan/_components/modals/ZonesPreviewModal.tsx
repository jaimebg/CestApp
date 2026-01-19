/**
 * Modal for previewing applied zones on a receipt image
 */

import { View, Text, ScrollView, Pressable, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import Svg, { Rect } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ZONE_COLORS, type ZoneDefinition } from '@/src/types/zones';
import type { ReviewColors } from '../types';

interface ZonesPreviewModalProps {
  visible: boolean;
  onClose: () => void;
  zones: ZoneDefinition[];
  imageUri: string | null;
  isPdf: boolean;
  dimensions: { width: number; height: number };
  screenWidth: number;
  colors: ReviewColors;
}

export function ZonesPreviewModal({
  visible,
  onClose,
  zones,
  imageUri,
  isPdf,
  dimensions,
  screenWidth,
  colors,
}: ZonesPreviewModalProps) {
  const { t } = useTranslation();

  const imageAspectRatio = dimensions.width / dimensions.height;
  const previewWidth = screenWidth - 32;
  const previewHeight = previewWidth / imageAspectRatio;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
        {/* Header */}
        <View
          className="flex-row items-center justify-between px-4 py-4 border-b"
          style={{ borderColor: colors.border }}
        >
          <Pressable onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
          <Text className="text-lg" style={{ color: colors.text, fontFamily: 'Inter_600SemiBold' }}>
            {t('scan.appliedZones')}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Zones Preview */}
        <ScrollView className="flex-1 p-4">
          {imageUri && !isPdf && (
            <View className="items-center">
              <View style={{ width: previewWidth, height: previewHeight }}>
                <Image
                  source={{ uri: imageUri }}
                  style={{ width: previewWidth, height: previewHeight }}
                  contentFit="contain"
                />
                <Svg
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: previewWidth,
                    height: previewHeight,
                  }}
                >
                  {zones.map((zone) => {
                    const bb = zone.boundingBox;
                    return (
                      <Rect
                        key={zone.id}
                        x={bb.x * previewWidth}
                        y={bb.y * previewHeight}
                        width={bb.width * previewWidth}
                        height={bb.height * previewHeight}
                        fill={`${ZONE_COLORS[zone.type]}40`}
                        stroke={ZONE_COLORS[zone.type]}
                        strokeWidth={2}
                      />
                    );
                  })}
                </Svg>
              </View>
            </View>
          )}

          {/* Zone Legend */}
          <View className="mt-4">
            <Text
              className="text-sm mb-3"
              style={{ color: colors.text, fontFamily: 'Inter_600SemiBold' }}
            >
              {t('scan.zoneTypes')}
            </Text>
            {zones.map((zone) => (
              <View key={zone.id} className="flex-row items-center mb-2">
                <View
                  className="w-4 h-4 rounded mr-3"
                  style={{ backgroundColor: ZONE_COLORS[zone.type] }}
                />
                <Text
                  className="text-sm capitalize"
                  style={{ color: colors.text, fontFamily: 'Inter_400Regular' }}
                >
                  {zone.type.replace('_', ' ')}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

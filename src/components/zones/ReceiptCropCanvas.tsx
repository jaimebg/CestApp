import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';
import Svg, { Rect } from 'react-native-svg';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSharedValue, runOnJS } from 'react-native-reanimated';
import { fitInBox } from '@/src/theme/layout';
import { useAppColors } from '@/src/hooks/useAppColors';
import type { NormalizedBoundingBox } from '@/src/types/zones';

/** Padding between the receipt and the edges of the space it is given. */
const CANVAS_INSET = 16;

interface ReceiptCropCanvasProps {
  imageUri: string;
  imageDimensions: { width: number; height: number };
  crop: NormalizedBoundingBox | null;
  onCropChange: (crop: NormalizedBoundingBox) => void;
}

export function ReceiptCropCanvas({
  imageUri,
  imageDimensions,
  crop,
  onCropChange,
}: ReceiptCropCanvasProps) {
  const colors = useAppColors();
  const { t } = useTranslation();
  const [availableBox, setAvailableBox] = useState<{ width: number; height: number } | null>(null);

  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  // fitInBox throws on a non-positive aspect and this is a render path, so both
  // dimensions are checked before dividing.
  const usable =
    availableBox && imageDimensions.width > 0 && imageDimensions.height > 0
      ? fitInBox({
          aspect: imageDimensions.width / imageDimensions.height,
          maxWidth: availableBox.width - CANVAS_INSET * 2,
          maxHeight: availableBox.height - CANVAS_INSET * 2,
        })
      : null;

  const commit = (x1: number, y1: number, x2: number, y2: number) => {
    if (!usable) return;
    const normalize = (value: number, extent: number) => Math.max(0, Math.min(1, value / extent));
    const left = normalize(Math.min(x1, x2), usable.width);
    const right = normalize(Math.max(x1, x2), usable.width);
    const top = normalize(Math.min(y1, y2), usable.height);
    const bottom = normalize(Math.max(y1, y2), usable.height);
    onCropChange({ x: left, y: top, width: right - left, height: bottom - top });
  };

  const pan = Gesture.Pan()
    .onStart((event) => {
      startX.value = event.x;
      startY.value = event.y;
    })
    .onUpdate((event) => {
      runOnJS(commit)(startX.value, startY.value, event.x, event.y);
    });

  return (
    <GestureHandlerRootView
      style={{ flex: 1 }}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setAvailableBox({ width, height });
      }}
    >
      {usable && (
        <View
          className="items-center"
          accessible={true}
          accessibilityLabel={t('scan.cropInstructions')}
          accessibilityHint={t('scan.cropInstructions')}
        >
          <GestureDetector gesture={pan}>
            <View style={{ width: usable.width, height: usable.height }}>
              <Image
                source={{ uri: imageUri }}
                style={{ width: usable.width, height: usable.height }}
                contentFit="fill"
              />
              <Svg
                width={usable.width}
                height={usable.height}
                style={{ position: 'absolute', top: 0, left: 0 }}
              >
                {crop && (
                  <Rect
                    x={crop.x * usable.width}
                    y={crop.y * usable.height}
                    width={crop.width * usable.width}
                    height={crop.height * usable.height}
                    fill={colors.action}
                    fillOpacity={0.15}
                    stroke={colors.action}
                    strokeWidth={2}
                  />
                )}
              </Svg>
            </View>
          </GestureDetector>
        </View>
      )}
    </GestureHandlerRootView>
  );
}

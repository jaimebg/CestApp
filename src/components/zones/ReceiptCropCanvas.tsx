import { useState } from 'react';
import { View } from 'react-native';
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

  const commit = (left: number, top: number, width: number, height: number) => {
    if (!usable) return;
    onCropChange({
      x: Math.max(0, Math.min(1, left / usable.width)),
      y: Math.max(0, Math.min(1, top / usable.height)),
      width: Math.min(1, width / usable.width),
      height: Math.min(1, height / usable.height),
    });
  };

  const pan = Gesture.Pan()
    .onStart((event) => {
      startX.value = event.x;
      startY.value = event.y;
    })
    .onUpdate((event) => {
      runOnJS(commit)(
        Math.min(startX.value, event.x),
        Math.min(startY.value, event.y),
        Math.abs(event.x - startX.value),
        Math.abs(event.y - startY.value)
      );
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
        <View className="items-center">
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

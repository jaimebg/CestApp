import { useEffect } from 'react';
import { View } from 'react-native';
import type { DimensionValue } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { useIsDarkMode } from '@/src/hooks/useAppColors';

interface SkeletonProps {
  width: DimensionValue;
  height: number;
  borderRadius?: number;
  className?: string;
}

export function Skeleton({ width, height, borderRadius = 8, className }: SkeletonProps) {
  const isDark = useIsDarkMode();
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(withTiming(1, { duration: 1200 }), -1, false);
  }, [shimmer]);

  const animatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(shimmer.value, [0, 0.5, 1], [0.3, 0.6, 0.3]);
    return {
      opacity,
    };
  });

  return (
    <View
      className={className}
      style={{
        width,
        height,
        borderRadius,
        overflow: 'hidden',
      }}
    >
      <Animated.View
        style={[
          {
            flex: 1,
            backgroundColor: isDark ? '#4A4640' : '#E8E4D9',
          },
          animatedStyle,
        ]}
      />
    </View>
  );
}

export function SkeletonText({ lines = 1, className }: { lines?: number; className?: string }) {
  return (
    <View className={`gap-2 ${className || ''}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          width={i === lines - 1 && lines > 1 ? '60%' : '100%'}
          height={16}
          borderRadius={4}
        />
      ))}
    </View>
  );
}

export function SkeletonCircle({ size = 40, className }: { size?: number; className?: string }) {
  return <Skeleton width={size} height={size} borderRadius={size / 2} className={className} />;
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <View className={`bg-surface dark:bg-surface-dark rounded-2xl p-4 ${className || ''}`}>
      <View className="flex-row items-center mb-3">
        <SkeletonCircle size={48} />
        <View className="flex-1 ml-3">
          <Skeleton width="60%" height={16} borderRadius={4} />
          <View className="h-2" />
          <Skeleton width="40%" height={12} borderRadius={4} />
        </View>
      </View>
      <SkeletonText lines={2} />
    </View>
  );
}

import { useEffect } from 'react';
import { ViewProps } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  FadeIn,
  FadeInDown,
  FadeInUp,
  Layout,
} from 'react-native-reanimated';

interface AnimatedListItemProps extends ViewProps {
  index: number;
  children: React.ReactNode;
  delay?: number;
  duration?: number;
}

export function AnimatedListItem({
  index,
  children,
  delay = 50,
  duration = 300,
  style,
  ...props
}: AnimatedListItemProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(10);

  useEffect(() => {
    const itemDelay = index * delay;
    opacity.value = withDelay(itemDelay, withTiming(1, { duration }));
    translateY.value = withDelay(itemDelay, withTiming(0, { duration }));
  }, [index, delay, duration, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[animatedStyle, style]} {...props}>
      {children}
    </Animated.View>
  );
}

export const enteringAnimations = {
  fadeIn: FadeIn.duration(300),
  fadeInDown: FadeInDown.duration(300).springify(),
  fadeInUp: FadeInUp.duration(300).springify(),
};

export const layoutAnimation = Layout.springify().damping(15);

interface AnimatedPressableProps {
  children: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  className?: string;
  style?: ViewProps['style'];
  scaleValue?: number;
}

export function AnimatedPressable({
  children,
  onPress,
  disabled,
  className,
  style,
  scaleValue = 0.98,
}: AnimatedPressableProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withTiming(scaleValue, { duration: 100 });
  };

  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: 150 });
  };

  return (
    <Animated.View
      style={[animatedStyle, style]}
      className={className}
      onTouchStart={disabled ? undefined : handlePressIn}
      onTouchEnd={disabled ? undefined : handlePressOut}
      onTouchCancel={disabled ? undefined : handlePressOut}
    >
      {children}
    </Animated.View>
  );
}

import { View, Text, Pressable } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

type IconName = keyof typeof Ionicons.glyphMap;

interface EmptyStateProps {
  icon: IconName;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View className="flex-1 justify-center items-center px-8 py-12">
      <Animated.View
        entering={FadeIn.delay(100).duration(400)}
        className="bg-primary/20 dark:bg-primary/30 rounded-full p-6 mb-4"
      >
        <Ionicons name={icon} size={48} color="#93BD57" />
      </Animated.View>
      <Animated.Text
        entering={FadeInUp.delay(200).duration(400)}
        className="text-lg text-text dark:text-text-dark text-center"
        style={{ fontFamily: 'Inter_600SemiBold' }}
      >
        {title}
      </Animated.Text>
      <Animated.Text
        entering={FadeInUp.delay(300).duration(400)}
        className="text-base text-text-secondary dark:text-text-dark-secondary text-center mt-2"
        style={{ fontFamily: 'Inter_400Regular' }}
      >
        {description}
      </Animated.Text>
      {actionLabel && onAction && (
        <Animated.View entering={FadeInUp.delay(400).duration(400)}>
          <Pressable
            onPress={onAction}
            className="mt-6 px-6 py-3 bg-primary rounded-xl active:opacity-80"
          >
            <Text
              className="text-white text-base"
              style={{ fontFamily: 'Inter_600SemiBold' }}
            >
              {actionLabel}
            </Text>
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

// Error state variant
interface ErrorStateProps {
  title: string;
  description: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorState({
  title,
  description,
  onRetry,
  retryLabel = 'Retry',
}: ErrorStateProps) {
  return (
    <View className="flex-1 justify-center items-center px-8 py-12">
      <Animated.View
        entering={FadeIn.delay(100).duration(400)}
        className="bg-error/20 rounded-full p-6 mb-4"
      >
        <Ionicons name="alert-circle-outline" size={48} color="#980404" />
      </Animated.View>
      <Animated.Text
        entering={FadeInUp.delay(200).duration(400)}
        className="text-lg text-text dark:text-text-dark text-center"
        style={{ fontFamily: 'Inter_600SemiBold' }}
      >
        {title}
      </Animated.Text>
      <Animated.Text
        entering={FadeInUp.delay(300).duration(400)}
        className="text-base text-text-secondary dark:text-text-dark-secondary text-center mt-2"
        style={{ fontFamily: 'Inter_400Regular' }}
      >
        {description}
      </Animated.Text>
      {onRetry && (
        <Animated.View entering={FadeInUp.delay(400).duration(400)}>
          <Pressable
            onPress={onRetry}
            className="mt-6 px-6 py-3 bg-error rounded-xl active:opacity-80"
          >
            <Text
              className="text-white text-base"
              style={{ fontFamily: 'Inter_600SemiBold' }}
            >
              {retryLabel}
            </Text>
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

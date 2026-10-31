import { Text } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './Button';
import { useAppColors } from '@/src/hooks/useAppColors';
import { useEntering } from '@/src/hooks/useEntering';

type IconName = keyof typeof Ionicons.glyphMap;

interface EmptyStateProps {
  icon: IconName;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  const colors = useAppColors();
  const entering = useEntering();

  return (
    <Animated.View
      entering={entering(FadeIn, 0, 300)}
      className="flex-1 justify-center items-center px-8 py-12"
    >
      <Ionicons name={icon} size={32} color={colors.textSecondary} style={{ marginBottom: 12 }} />
      <Text
        accessibilityRole="header"
        className="text-text dark:text-text-dark text-center"
        style={{ fontFamily: 'Inter_600SemiBold', fontSize: 17 }}
      >
        {title}
      </Text>
      <Text
        className="text-base text-text-secondary dark:text-text-dark-secondary text-center mt-2"
        style={{ fontFamily: 'Inter_400Regular' }}
      >
        {description}
      </Text>
      {actionLabel && onAction && (
        <Button onPress={onAction} className="mt-6">
          {actionLabel}
        </Button>
      )}
    </Animated.View>
  );
}

interface ErrorStateProps {
  title: string;
  description: string;
  onRetry?: () => void;
  /** Required so an English default can never leak into a Spanish screen. */
  retryLabel: string;
}

export function ErrorState({ title, description, onRetry, retryLabel }: ErrorStateProps) {
  const colors = useAppColors();
  const entering = useEntering();

  return (
    <Animated.View
      entering={entering(FadeIn, 0, 300)}
      className="flex-1 justify-center items-center px-8 py-12"
    >
      <Ionicons
        name="alert-circle-outline"
        size={32}
        color={colors.textSecondary}
        style={{ marginBottom: 12 }}
      />
      <Text
        accessibilityRole="header"
        className="text-text dark:text-text-dark text-center"
        style={{ fontFamily: 'Inter_600SemiBold', fontSize: 17 }}
      >
        {title}
      </Text>
      <Text
        className="text-base text-text-secondary dark:text-text-dark-secondary text-center mt-2"
        style={{ fontFamily: 'Inter_400Regular' }}
      >
        {description}
      </Text>
      {onRetry && (
        <Button onPress={onRetry} className="mt-6">
          {retryLabel}
        </Button>
      )}
    </Animated.View>
  );
}

import { View, Pressable } from 'react-native';
import type { ViewProps, PressableProps } from 'react-native';

type CardVariant = 'elevated' | 'outlined' | 'filled';
type CardPadding = 'none' | 'sm' | 'md' | 'lg';

interface CardProps extends ViewProps {
  variant?: CardVariant;
  padding?: CardPadding;
  onPress?: PressableProps['onPress'];
}

const variantClasses: Record<CardVariant, string> = {
  elevated: 'bg-surface dark:bg-surface-dark shadow-sm',
  outlined: 'bg-surface dark:bg-surface-dark border border-border dark:border-border-dark',
  filled: 'bg-primary/10 dark:bg-primary/20',
};

const paddingClasses: Record<CardPadding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export function Card({
  variant = 'elevated',
  padding = 'md',
  onPress,
  className,
  children,
  ...props
}: CardProps & { className?: string }) {
  const baseClasses = `
    rounded-2xl
    ${variantClasses[variant]}
    ${paddingClasses[padding]}
    ${className || ''}
  `;

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        className={`${baseClasses} active:opacity-80`}
        {...(props as PressableProps)}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View className={baseClasses} {...props}>
      {children}
    </View>
  );
}

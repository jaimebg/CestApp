import { Pressable, Text, ActivityIndicator, View } from 'react-native';
import type { PressableProps } from 'react-native';
import { useAppColors } from '@/src/hooks/useAppColors';
import { MIN_TARGET } from '@/src/theme/a11y';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<PressableProps, 'children'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-primary-deep active:bg-primary-dark',
  secondary:
    'bg-surface dark:bg-surface-dark border border-border dark:border-border-dark active:bg-border dark:active:bg-border-dark',
  ghost: 'bg-transparent active:bg-primary/10',
  // `active:bg-error/90` rather than `error-light`: the light shade is
  // ~2.5:1 against the white label, `/90` keeps the same hue and stays dark
  // enough for white text to stay legible while still giving press feedback.
  destructive: 'bg-error active:bg-error/90',
};

const variantTextClasses: Record<ButtonVariant, string> = {
  primary: 'text-white',
  secondary: 'text-text dark:text-text-dark',
  ghost: 'text-action dark:text-action-dark',
  destructive: 'text-white',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-2 rounded-lg',
  md: 'px-4 py-3 rounded-xl',
  lg: 'px-6 py-4 rounded-2xl',
};

const sizeTextClasses: Record<ButtonSize, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  leftIcon,
  rightIcon,
  children,
  className,
  style,
  accessibilityLabel,
  ...props
}: ButtonProps & { className?: string }) {
  const isDisabled = disabled || loading;
  const colors = useAppColors();

  return (
    <Pressable
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: loading }}
      accessibilityLabel={
        accessibilityLabel ?? (typeof children === 'string' ? children : undefined)
      }
      // `sm` padding alone lands around 34pt, below the reliable-tap floor.
      style={
        typeof style === 'function'
          ? (state) => [{ minHeight: MIN_TARGET }, style(state)]
          : [{ minHeight: MIN_TARGET }, style]
      }
      className={`
        flex-row items-center justify-center
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${isDisabled ? 'opacity-50' : ''}
        ${className || ''}
      `}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' || variant === 'destructive' ? '#FFFFFF' : colors.action}
        />
      ) : (
        <>
          {leftIcon && <View className="mr-2">{leftIcon}</View>}
          <Text
            className={`${variantTextClasses[variant]} ${sizeTextClasses[size]}`}
            style={{ fontFamily: 'Inter_600SemiBold' }}
          >
            {children}
          </Text>
          {rightIcon && <View className="ml-2">{rightIcon}</View>}
        </>
      )}
    </Pressable>
  );
}

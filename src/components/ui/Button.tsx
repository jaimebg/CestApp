import { Pressable, Text, ActivityIndicator, View } from 'react-native';
import type { PressableProps } from 'react-native';

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
  secondary: 'bg-surface dark:bg-surface-dark border border-border dark:border-border-dark active:bg-border dark:active:bg-border-dark',
  ghost: 'bg-transparent active:bg-primary/10',
  destructive: 'bg-error active:bg-error-light',
};

const variantTextClasses: Record<ButtonVariant, string> = {
  primary: 'text-white',
  secondary: 'text-text dark:text-text-dark',
  ghost: 'text-primary-deep dark:text-primary',
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
  ...props
}: ButtonProps & { className?: string }) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      disabled={isDisabled}
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
          color={variant === 'primary' || variant === 'destructive' ? '#FFFFFF' : '#3D6B23'}
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

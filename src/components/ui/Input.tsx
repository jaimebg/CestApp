import { View, Text, TextInput } from 'react-native';
import type { TextInputProps } from 'react-native';
import { useAppColors } from '@/src/hooks/useAppColors';
import { MIN_TARGET } from '@/src/theme/a11y';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Input({
  label,
  error,
  leftIcon,
  rightIcon,
  className,
  accessibilityLabel,
  ...props
}: InputProps & { className?: string }) {
  const colors = useAppColors();

  return (
    <View className={className}>
      {label && (
        <Text
          className="text-sm text-text-secondary dark:text-text-dark-secondary mb-2"
          style={{ fontFamily: 'Inter_500Medium' }}
        >
          {label}
        </Text>
      )}
      <View
        className={`
          flex-row items-center
          bg-surface dark:bg-surface-dark
          border rounded-xl px-4 py-3
          ${error ? 'border-error' : 'border-border dark:border-border-dark'}
        `}
        style={{ minHeight: MIN_TARGET }}
      >
        {leftIcon && <View className="mr-3">{leftIcon}</View>}
        <TextInput
          className="flex-1 text-base text-text dark:text-text-dark"
          placeholderTextColor={colors.textTertiary}
          style={{ fontFamily: 'Inter_400Regular' }}
          accessibilityLabel={accessibilityLabel ?? label}
          {...props}
        />
        {rightIcon && <View className="ml-3">{rightIcon}</View>}
      </View>
      {error && (
        <Text
          className="text-sm text-error dark:text-error-light mt-1"
          style={{ fontFamily: 'Inter_400Regular' }}
          accessibilityLiveRegion="polite"
        >
          {error}
        </Text>
      )}
    </View>
  );
}

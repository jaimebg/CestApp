import { View, Text, TextInput, useColorScheme } from 'react-native';
import type { TextInputProps } from 'react-native';

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
  ...props
}: InputProps & { className?: string }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

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
      >
        {leftIcon && <View className="mr-3">{leftIcon}</View>}
        <TextInput
          className="flex-1 text-base text-text dark:text-text-dark"
          placeholderTextColor={isDark ? '#8D8680' : '#8D8680'}
          style={{ fontFamily: 'Inter_400Regular' }}
          {...props}
        />
        {rightIcon && <View className="ml-3">{rightIcon}</View>}
      </View>
      {error && (
        <Text
          className="text-sm text-error mt-1"
          style={{ fontFamily: 'Inter_400Regular' }}
        >
          {error}
        </Text>
      )}
    </View>
  );
}

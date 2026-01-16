import { View, Text } from 'react-native';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  label: string;
  icon?: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, { bg: string; text: string }> = {
  default: {
    bg: 'bg-text/10 dark:bg-text-dark/10',
    text: 'text-text dark:text-text-dark',
  },
  success: {
    bg: 'bg-primary/20',
    text: 'text-primary-deep dark:text-primary',
  },
  warning: {
    bg: 'bg-golden/40',
    text: 'text-text dark:text-text-dark',
  },
  error: {
    bg: 'bg-error/20',
    text: 'text-error dark:text-error-light',
  },
  info: {
    bg: 'bg-category-dairy/20',
    text: 'text-category-dairy',
  },
};

const sizeClasses: Record<BadgeSize, { container: string; text: string }> = {
  sm: {
    container: 'px-2 py-0.5 rounded-md',
    text: 'text-xs',
  },
  md: {
    container: 'px-3 py-1 rounded-lg',
    text: 'text-sm',
  },
};

export function Badge({ variant = 'default', size = 'md', label, icon, className }: BadgeProps) {
  const variantStyle = variantClasses[variant];
  const sizeStyle = sizeClasses[size];

  return (
    <View
      className={`
        flex-row items-center self-start
        ${variantStyle.bg}
        ${sizeStyle.container}
        ${className || ''}
      `}
    >
      {icon && <View className="mr-1">{icon}</View>}
      <Text
        className={`${variantStyle.text} ${sizeStyle.text}`}
        style={{ fontFamily: 'Inter_500Medium' }}
      >
        {label}
      </Text>
    </View>
  );
}

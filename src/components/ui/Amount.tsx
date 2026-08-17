/**
 * A monetary value.
 *
 * Wraps every price, subtotal and total so they share one treatment: tabular
 * figures that align in a column, and a weight that scales with how important
 * the number is. Screen-reader users get the amount as one spoken phrase
 * rather than a stray fragment of the row around it.
 */

import { Text } from 'react-native';
import type { TextProps } from 'react-native';
import { money, type MonoWeight } from '@/src/theme/type';

type AmountSize = 'sm' | 'base' | 'lg' | 'xl' | 'hero';

const sizeClasses: Record<AmountSize, string> = {
  sm: 'text-sm',
  base: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
  hero: 'text-4xl',
};

// No Bold: a monospace reads heavier than a proportional face at the same
// weight, and a third font file is not worth the startup cost.
const sizeWeights: Record<AmountSize, MonoWeight> = {
  sm: 'regular',
  base: 'regular',
  lg: 'semibold',
  xl: 'semibold',
  hero: 'semibold',
};

interface AmountProps extends TextProps {
  children: React.ReactNode;
  size?: AmountSize;
  /** Overrides the weight the size would otherwise pick. */
  weight?: MonoWeight;
  className?: string;
}

export function Amount({
  children,
  size = 'base',
  weight,
  className,
  style,
  ...props
}: AmountProps) {
  return (
    <Text
      className={`text-text dark:text-text-dark ${sizeClasses[size]} ${className || ''}`}
      style={[money(weight ?? sizeWeights[size]), style]}
      {...props}
    >
      {children}
    </Text>
  );
}

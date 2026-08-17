/**
 * A monetary value.
 *
 * Wraps every price, subtotal and total so they share one treatment: tabular
 * figures that align in a column, and a weight that scales with how important
 * the number is.
 */

import { Text } from 'react-native';
import type { TextProps } from 'react-native';
import { money, type MonoWeight } from '@/src/theme/type';
import { useAppColors } from '@/src/hooks/useAppColors';

type AmountSize = 'sm' | 'base' | 'lg' | 'xl' | 'hero';
type AmountTone = 'default' | 'action';

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
  /** Text colour. Defaults to the standard reading colour. */
  tone?: AmountTone;
  className?: string;
}

export function Amount({
  children,
  size = 'base',
  weight,
  tone = 'default',
  className,
  style,
  ...props
}: AmountProps) {
  const colors = useAppColors();
  const toneColor = tone === 'action' ? colors.action : colors.text;

  return (
    // Colour goes through `style`, not `className`: Tailwind resolves
    // conflicting classes by stylesheet order, not by which one a caller
    // passed last, and `.text-text` is emitted after `.text-action` — so a
    // `className="text-action"` override here would silently lose. `style`
    // always wins over `className`, so `tone` cannot be fought this way.
    <Text
      className={`${sizeClasses[size]} ${className || ''}`}
      style={[money(weight ?? sizeWeights[size]), { color: toneColor }, style]}
      {...props}
    >
      {children}
    </Text>
  );
}

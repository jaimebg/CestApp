import { View, type ViewProps } from 'react-native';
import { READING_MAX } from '@/src/theme/layout';

/**
 * The centred column screen content sits in.
 *
 * Replaces a `max-w-[640px]` that had been copied to twelve call sites and to
 * the analytics chart-width maths, where the two could disagree.
 */
export function ReadingColumn({ children, className = '', style, ...rest }: ViewProps) {
  return (
    <View
      className={`w-full mx-auto${className ? ` ${className}` : ''}`}
      style={[{ maxWidth: READING_MAX }, style]}
      {...rest}
    >
      {children}
    </View>
  );
}

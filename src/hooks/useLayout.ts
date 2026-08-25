import { useWindowDimensions } from 'react-native';
import { resolveLayout, type Layout } from '@/src/theme/layout';

/**
 * Breakpoints for the current viewport.
 *
 * `useWindowDimensions` re-renders on rotation, so every consumer becomes
 * orientation-aware without registering a listener of its own.
 */
export function useLayout(): Layout {
  const { width, height } = useWindowDimensions();
  return resolveLayout({ width, height });
}

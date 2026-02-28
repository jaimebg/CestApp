/**
 * Hook to get theme colors based on current color scheme
 */

import { usePreferencesStore } from '../store/preferences';
import { lightColors, darkColors, type AppColors } from '../theme/colors';

export function useAppColors(): AppColors {
  const colorScheme = usePreferencesStore((state) => state.colorScheme);
  return colorScheme === 'dark' ? darkColors : lightColors;
}

export function useIsDarkMode(): boolean {
  const colorScheme = usePreferencesStore((state) => state.colorScheme);
  return colorScheme === 'dark';
}

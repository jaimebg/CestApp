/**
 * Hook to get theme colors based on current color scheme
 */

import { useColorScheme } from 'react-native';
import { lightColors, darkColors, type AppColors } from '../theme/colors';

export function useAppColors(): AppColors {
  const colorScheme = useColorScheme();
  return colorScheme === 'dark' ? darkColors : lightColors;
}

export function useIsDarkMode(): boolean {
  const colorScheme = useColorScheme();
  return colorScheme === 'dark';
}

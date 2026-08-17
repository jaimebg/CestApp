/**
 * Runtime theme colours, derived from the same palette Tailwind compiles
 * against (src/theme/palette.js) so `className` and `useAppColors()` can
 * never disagree about what a token means.
 *
 * Prefer `action` over `primary` for anything the user reads or taps:
 * `primary` is a fill and fails contrast as ink on a light ground.
 */

import { colors as palette, chartSeries } from './palette';

/** Fallback colour order for chart series without a category colour. */
export { chartSeries };

export const lightColors = {
  background: palette.background.DEFAULT,
  surface: palette.surface.DEFAULT,
  text: palette.text.DEFAULT,
  textSecondary: palette.text.secondary,
  textTertiary: palette.text.tertiary,
  border: palette.border.DEFAULT,
  primary: palette.primary.DEFAULT,
  primaryDark: palette.primary.dark,
  primaryDeep: palette.primary.deep,
  action: palette.action.DEFAULT,
  accent: palette.accent.DEFAULT,
  warning: palette.warning.DEFAULT,
  error: palette.error.DEFAULT,
  info: palette.info.DEFAULT,
};

export const darkColors: AppColors = {
  background: palette.background.dark,
  surface: palette.surface.dark,
  text: palette.text.dark,
  textSecondary: palette.text['dark-secondary'],
  textTertiary: palette.text['dark-tertiary'],
  border: palette.border.dark,
  primary: palette.primary.DEFAULT,
  primaryDark: palette.primary.dark,
  primaryDeep: palette.primary.deep,
  action: palette.action.dark,
  accent: palette.accent.dark,
  warning: palette.warning.dark,
  error: palette.error.light,
  info: palette.info.dark,
};

export type AppColors = {
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  /** Placeholders and hints. Clears 4.5:1 on its own ground. */
  textTertiary: string;
  border: string;
  /** Fill only. Fails contrast as ink on a light ground — use `action`. */
  primary: string;
  primaryDark: string;
  primaryDeep: string;
  /** Interactive ink: labels, icon tints, active states. */
  action: string;
  /** Fill only. Use `warning` for warning text and icons. */
  accent: string;
  warning: string;
  error: string;
  info: string;
};

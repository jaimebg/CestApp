/**
 * Typography tokens.
 *
 * The app loads Inter as five separate families, one per weight. Tailwind's
 * `font-semibold` sets `fontWeight` instead, which leaves `fontFamily` unset
 * and silently renders that text in the system font — so weight always goes
 * through `fonts`, never through a utility class.
 */

import type { TextStyle } from 'react-native';

export const fonts = {
  light: 'Inter_300Light',
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export type FontWeight = keyof typeof fonts;

/**
 * Monetary values.
 *
 * A paper receipt aligns its prices in a column; the app should too. Inter's
 * tabular figures give every digit the same advance width, so a list of
 * totals lines up down the screen instead of wandering with the digits. The
 * slight negative tracking stops long euro amounts from looking loose.
 *
 * This is the one place the app's typography is allowed to be distinctive —
 * amounts are the subject, so they get the treatment.
 */
export function money(weight: FontWeight = 'semibold'): TextStyle {
  return {
    fontFamily: fonts[weight],
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.2,
  };
}

/**
 * Typography tokens.
 *
 * The app loads Inter as five separate families, one per weight. Tailwind's
 * `font-semibold` sets `fontWeight` instead, which leaves `fontFamily` unset
 * and silently renders that text in the system font — so weight always goes
 * through `fonts`, never through a utility class.
 */

import type { TextStyle } from 'react-native';
import {
  Inter_300Light,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';

export const fonts = {
  light: 'Inter_300Light',
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export type FontWeight = keyof typeof fonts;

/**
 * The binaries `useFonts` loads, keyed by the family name styles reference.
 *
 * Declared here rather than in the layout so there is exactly one list. Computed
 * keys make a name typo harmless (propagates to both sides, stays self-consistent).
 * Tests guard the declare/register asymmetry: a weight in `fonts` but missing here,
 * or vice versa. Swapped pairings (right name, wrong binary) are invisible — jest-expo
 * stubs all assets to the same value — so they must be caught by reading the map.
 */
export const fontModules = {
  [fonts.light]: Inter_300Light,
  [fonts.regular]: Inter_400Regular,
  [fonts.medium]: Inter_500Medium,
  [fonts.semibold]: Inter_600SemiBold,
  [fonts.bold]: Inter_700Bold,
};

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

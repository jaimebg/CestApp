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
import { IBMPlexMono_400Regular, IBMPlexMono_600SemiBold } from '@expo-google-fonts/ibm-plex-mono';

export const fonts = {
  light: 'Inter_300Light',
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export type FontWeight = keyof typeof fonts;

/**
 * The face currency is set in.
 *
 * Thermal printers set receipts in monospace, so the app's figures read as
 * receipt figures — and every digit shares an advance width, so a column of
 * prices lines up down the screen. Two weights only: each is a separate file
 * loaded before first paint, and five Inter weights already load.
 */
export const mono = {
  regular: 'IBMPlexMono_400Regular',
  semibold: 'IBMPlexMono_600SemiBold',
} as const;

export type MonoWeight = keyof typeof mono;

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
  [mono.regular]: IBMPlexMono_400Regular,
  [mono.semibold]: IBMPlexMono_600SemiBold,
};

/**
 * Monetary values.
 *
 * `fontVariant: ['tabular-nums']` is deliberately absent — a true monospace is
 * already tabular, so the declaration would be redundant. Plex Mono sets wider
 * than Inter, hence the firmer negative tracking; without it long euro amounts
 * such as €1.234,56 read loose.
 */
export function money(weight: MonoWeight = 'semibold'): TextStyle {
  return {
    fontFamily: mono[weight],
    letterSpacing: -0.4,
  };
}

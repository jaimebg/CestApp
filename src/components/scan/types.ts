/**
 * Shared types for the review screen components
 */

import type { AppColors } from '../../theme/colors';

export type Category = {
  id: number;
  name: string;
  icon: string | null;
  color: string | null;
};

/**
 * The review screen threads the theme down as a prop. Aliased rather than
 * redeclared so it cannot drift from what `useAppColors()` actually returns.
 */
export type ReviewColors = AppColors;

/**
 * Breakpoints and fit maths, kept free of React so they can be tested directly.
 */

/** Shortest side at or above this is a tablet. Material's sw600dp threshold. */
export const TABLET_MIN_SIDE = 600;

/** Prose, forms and modals never exceed this, however wide the screen. */
export const READING_MAX = 640;

/** Card grids may use this much of a wide screen. */
export const GRID_MAX = 1080;

/** Below this the second column leaves cards too narrow to read. */
export const TWO_COLUMN_MIN = 900;

export interface Viewport {
  width: number;
  height: number;
}

export interface Layout {
  isTablet: boolean;
  isLandscape: boolean;
  readingWidth: number;
  gridWidth: number;
  columns: 1 | 2;
}

export function resolveLayout({ width, height }: Viewport): Layout {
  const gridWidth = Math.min(width, GRID_MAX);
  return {
    /** Shortest side, so a tablet is still a tablet once it rotates. */
    isTablet: Math.min(width, height) >= TABLET_MIN_SIDE,
    isLandscape: width > height,
    readingWidth: Math.min(width, READING_MAX),
    gridWidth,
    columns: gridWidth >= TWO_COLUMN_MIN ? 2 : 1,
  };
}

export interface FitInput {
  aspect: number;
  maxWidth: number;
  maxHeight: number;
}

/**
 * Largest box of `aspect` fitting inside `maxWidth` x `maxHeight`.
 *
 * The zone surfaces sized themselves from width alone, so a tall receipt
 * overflowed a container that offers no way to scroll to the rest of it.
 */
export function fitInBox({ aspect, maxWidth, maxHeight }: FitInput): {
  width: number;
  height: number;
} {
  if (!(aspect > 0)) {
    throw new Error(`fitInBox: aspect must be positive, got ${aspect}`);
  }
  const width = Math.min(maxWidth, maxHeight * aspect);
  return { width, height: width / aspect };
}

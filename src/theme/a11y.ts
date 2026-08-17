/**
 * Accessibility constants shared by the UI primitives.
 */

/**
 * Minimum tappable size. iOS HIG asks for 44pt, Material for 48dp; 44 is the
 * floor both platforms accept and what WCAG 2.5.8 measures against.
 */
export const MIN_TARGET = 44;

/**
 * Default hit area padding for icon-only controls that cannot grow to
 * MIN_TARGET without breaking the layout around them.
 */
export const ICON_HIT_SLOP = 12;

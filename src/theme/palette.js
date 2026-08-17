/**
 * Single source of truth for every colour in the app.
 *
 * Consumed by `tailwind.config.js` (loaded by Node at build time) and by
 * `src/theme/colors.ts` (loaded by Metro at runtime), so the two can never
 * drift apart. Plain CommonJS because the Tailwind config is not transpiled.
 *
 * Ratios in the comments are measured contrast against the ground each token
 * is actually used on. WCAG AA needs 4.5:1 for text and 3:1 for icons.
 *
 * The brand green appears twice on purpose:
 *   `fresh`  #93BD57 is a FILL. It is 2.11:1 on cream, so it is never ink.
 *   `deep`   #3D6B23 is the INK. Every label, icon tint and active state.
 */

const grounds = {
  cream: '#FFFDE1',
  white: '#FFFFFF',
  charcoal: '#1A1918',
  charcoalRaised: '#2D2A26',
  charcoalHigh: '#3D3A36',
};

const brand = {
  cream: '#FFFDE1',
  golden: '#FBE580',
  fresh: '#93BD57',
  burgundy: '#980404',
};

const colors = {
  ...brand,

  background: { DEFAULT: grounds.cream, dark: grounds.charcoal },
  surface: { DEFAULT: grounds.white, dark: grounds.charcoalRaised },
  'surface-elevated': { DEFAULT: grounds.white, dark: grounds.charcoalHigh },

  primary: {
    DEFAULT: '#93BD57', //         fill only — 2.11:1 on cream, never use as ink
    light: '#A8CE6F', //           fill only
    dark: '#5C8A32', //            pressed state under `deep`
    deep: '#3D6B23', //            6.13:1 cream · 6.31:1 white — carries white text
  },

  /**
   * Interactive ink: labels, icon tints, active states, selected chips.
   * Split out of `primary` because `primary` cannot carry text on a light
   * ground. Use as `text-action dark:text-action-dark`.
   */
  action: {
    DEFAULT: '#3D6B23', //         6.13:1 cream · 6.31:1 white
    dark: '#A8CE6F', //            9.80:1 charcoal · 7.97:1 raised
  },

  accent: {
    DEFAULT: '#FBE580', //         fill only — 1.23:1 on cream, never ink
    dark: '#E8D46D',
  },

  /** Warning ink. The golden hue dropped in luminance until it reads on cream. */
  warning: {
    DEFAULT: '#8A6A00', //         4.92:1 cream · 5.07:1 white
    dark: '#FBE580', //            11.30:1 charcoal
  },

  error: {
    DEFAULT: '#980404', //         8.66:1 cream
    light: '#E88A84', //           7.02:1 charcoal · 5.71:1 raised
  },

  info: {
    DEFAULT: '#2F6E9E', //         5.46:1 white
    dark: '#7FBEE8', //            7.09:1 raised
  },

  text: {
    DEFAULT: '#2D2A26',
    secondary: '#6B6560', //       5.74:1 white · 5.58:1 cream
    tertiary: '#767068', //        4.90:1 white — placeholders and hints
    dark: grounds.cream,
    'dark-secondary': '#B8B4A9', // 8.48:1 charcoal · 6.89:1 raised
    'dark-tertiary': '#9C958C', //  4.82:1 raised · 5.93:1 charcoal
  },

  border: { DEFAULT: '#E8E4D9', dark: '#4A4640' },

  category: {
    produce: '#93BD57',
    dairy: '#5BA4D9',
    meat: '#980404',
    bakery: '#FBE580',
    beverages: '#8B7EC8',
    frozen: '#4DB6AC',
    pantry: '#E8976C',
    household: '#8D8680',
  },
};

/**
 * Chart series order, used when a category has no colour of its own.
 * Ordered so neighbouring slices stay distinguishable rather than by hue.
 */
const chartSeries = [
  colors.category.produce,
  colors.category.dairy,
  colors.category.meat,
  colors.category.bakery,
  colors.category.beverages,
  colors.category.frozen,
  colors.category.pantry,
  colors.category.household,
  '#D4A574',
  colors.primary.light,
];

module.exports = { colors, chartSeries };

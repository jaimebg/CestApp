/**
 * Contrast guards for the palette.
 *
 * The brand green (#93BD57) reads well as a fill and fails badly as ink — it
 * measures 2.11:1 on cream. It was the app's action colour once; these tests
 * exist so it cannot become one again.
 */

import { lightColors, darkColors } from '../colors';

/** WCAG 2.1 relative luminance, sRGB. */
function luminance(hex: string): number {
  const channels = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

const AA_TEXT = 4.5;
const AA_NON_TEXT = 3;
const WHITE = '#FFFFFF';

describe('palette contrast', () => {
  describe.each([
    ['light', lightColors],
    ['dark', darkColors],
  ])('%s theme', (_name, c) => {
    it.each([
      ['text on background', () => contrast(c.text, c.background)],
      ['text on surface', () => contrast(c.text, c.surface)],
      ['textSecondary on background', () => contrast(c.textSecondary, c.background)],
      ['textSecondary on surface', () => contrast(c.textSecondary, c.surface)],
      ['textTertiary on surface', () => contrast(c.textTertiary, c.surface)],
      ['action on background', () => contrast(c.action, c.background)],
      ['action on surface', () => contrast(c.action, c.surface)],
      ['error on background', () => contrast(c.error, c.background)],
      ['error on surface', () => contrast(c.error, c.surface)],
      ['warning on surface', () => contrast(c.warning, c.surface)],
      ['info on surface', () => contrast(c.info, c.surface)],
    ])('%s clears AA for text', (_label, ratio) => {
      expect(ratio()).toBeGreaterThanOrEqual(AA_TEXT);
    });

    it('white text clears AA on the primary-deep fill', () => {
      expect(contrast(WHITE, c.primaryDeep)).toBeGreaterThanOrEqual(AA_TEXT);
    });

    it('action is legible enough to tint an icon', () => {
      expect(contrast(c.action, c.background)).toBeGreaterThanOrEqual(AA_NON_TEXT);
    });
  });

  it('never uses the brand fill green as ink on a light ground', () => {
    // Documents why `action` exists: this is what the old value measured.
    expect(contrast(lightColors.primary, lightColors.background)).toBeLessThan(AA_TEXT);
    expect(lightColors.action).not.toBe(lightColors.primary);
  });

  it('keeps the two themes on the same token set', () => {
    expect(Object.keys(darkColors).sort()).toEqual(Object.keys(lightColors).sort());
  });
});

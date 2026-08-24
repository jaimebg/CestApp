/** WCAG 2.1 relative luminance, sRGB. */
function luminance(hex: string): number {
  const channels = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

export function getContrastingInk(bgColor: string): string {
  return luminance(bgColor) < 0.25 ? '#FFFFFF' : '#1C1C1E';
}

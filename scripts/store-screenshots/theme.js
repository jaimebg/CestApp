import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');

/**
 * Brand values used by the store graphics. Mirrors `src/theme/palette.js`, which
 * this file cannot import: the palette is CommonJS consumed by Metro and
 * Tailwind, and these scripts run as ESM under plain Node.
 *
 * `fresh` is a fill only (2.11:1 on cream). Every caption and label uses `deep`.
 */
export const BRAND = {
  cream: '#FFFDE1',
  creamWarm: '#FDF4C4',
  golden: '#FBE580',
  fresh: '#93BD57',
  deep: '#3D6B23',
  charcoal: '#1A1918',
  charcoalRaised: '#2D2A26',
};

const inter = (weight, file) =>
  path.join(root, 'node_modules', '@expo-google-fonts', 'inter', weight, file);

export const FONTS = {
  400: inter('400Regular', 'Inter_400Regular.ttf'),
  500: inter('500Medium', 'Inter_500Medium.ttf'),
  600: inter('600SemiBold', 'Inter_600SemiBold.ttf'),
  700: inter('700Bold', 'Inter_700Bold.ttf'),
};

export const LOGO = path.join(root, 'assets', 'images', 'cestapp-logo.png');

const uriCache = new Map();

export function dataUri(file, mime) {
  const key = `${mime}:${file}`;
  if (!uriCache.has(key)) {
    uriCache.set(key, `data:${mime};base64,${fs.readFileSync(file).toString('base64')}`);
  }
  return uriCache.get(key);
}

/** Every weight in `FONTS` as `@font-face` rules with the TTF inlined. */
export function fontFaces() {
  return Object.entries(FONTS)
    .map(
      ([weight, file]) => `@font-face {
        font-family: 'Inter';
        font-style: normal;
        font-weight: ${weight};
        src: url('${dataUri(file, 'font/ttf')}') format('truetype');
      }`
    )
    .join('\n');
}

export function assertAssets() {
  for (const [weight, file] of Object.entries(FONTS)) {
    if (!fs.existsSync(file)) throw new Error(`Missing Inter ${weight} TTF: ${file}`);
  }
  if (!fs.existsSync(LOGO)) throw new Error(`Missing logo asset: ${LOGO}`);
}

export const escapeHtml = (text) =>
  String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** Rounds to 3dp so the emitted CSS stays readable and diffs stay stable. */
export const px = (value) => `${Math.round(value * 1000) / 1000}px`;

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');

export const DEFAULT_FONTS = {
  regular: path.join(
    root,
    'node_modules',
    '@expo-google-fonts',
    'inter',
    '400Regular',
    'Inter_400Regular.ttf'
  ),
  bold: path.join(
    root,
    'node_modules',
    '@expo-google-fonts',
    'inter',
    '700Bold',
    'Inter_700Bold.ttf'
  ),
};

const fontCache = new Map();

function fontFace(weight, ttfPath) {
  if (!fontCache.has(ttfPath)) {
    const ttf = fs.readFileSync(ttfPath);
    fontCache.set(ttfPath, `data:font/ttf;base64,${ttf.toString('base64')}`);
  }
  return `@font-face {
    font-family: 'Inter';
    font-style: normal;
    font-weight: ${weight};
    src: url('${fontCache.get(ttfPath)}') format('truetype');
  }`;
}

const escapeHtml = (text) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function slotHtml({
  caption,
  shotDataUri,
  width,
  height,
  fit = 'cover',
  fonts = DEFAULT_FONTS,
}) {
  const captionSize = Math.round(height * 0.021);
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      ${fontFace(400, fonts.regular)}
      ${fontFace(700, fonts.bold)}
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      html,
      body {
        width: ${width}px;
        height: ${height}px;
        overflow: hidden;
        background: #fffde1;
        -webkit-font-smoothing: antialiased;
      }
      .stage {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
      }
      .band {
        flex: 0 0 12%;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 4%;
      }
      .caption {
        font-family: 'Inter', sans-serif;
        font-weight: 700;
        color: #3d6b23;
        font-size: ${captionSize}px;
        line-height: 1.15;
        letter-spacing: -0.01em;
        text-align: center;
      }
      .frame-area {
        flex: 0 0 84%;
        min-height: 0;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .frame {
        width: 92%;
        height: 95%;
        border-radius: 60px;
        border: 2px solid rgba(61, 107, 35, 0.25);
        box-shadow: 0 24px 60px rgba(61, 107, 35, 0.18);
        overflow: hidden;
        background: ${fit === 'contain' ? '#fffde1' : '#ffffff'};
      }
      .frame img {
        width: 100%;
        height: 100%;
        object-fit: ${fit};
        display: block;
      }
      .strip {
        flex: 0 0 4%;
        background: #93bd57;
      }
    </style>
  </head>
  <body>
    <div class="stage">
      <div class="band"><div class="caption">${escapeHtml(caption)}</div></div>
      <div class="frame-area"><div class="frame"><img src="${shotDataUri}" /></div></div>
      <div class="strip"></div>
    </div>
  </body>
</html>`;
}

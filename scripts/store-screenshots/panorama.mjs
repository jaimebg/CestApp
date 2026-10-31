// Lays the six composed English phone screenshots side by side for the README:
// assets/screenshots/panorama.png. Run after compose (`npm run shots:panorama`).
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { imageSize } from 'image-size';
import { SCREEN_ORDER } from './captions.js';
import { SLOTS } from './slots.js';

const ROOT = process.cwd();
const HEIGHT = 840;
const GAP = 20;
const OUT = path.join(ROOT, 'assets', 'screenshots', 'panorama.png');

const slot = SLOTS.find((candidate) => candidate.id === 'ios-phone');
const tiles = SCREEN_ORDER.map((screenId) => {
  const file = path.join(ROOT, slot.dirFor('en-US'), slot.fileFor(screenId));
  if (!fs.existsSync(file))
    throw new Error(`Missing ${path.relative(ROOT, file)}; run compose first`);
  return `data:image/png;base64,${fs.readFileSync(file).toString('base64')}`;
});

const tileWidth = Math.round((HEIGHT * slot.width) / slot.height);
const width = tiles.length * tileWidth + (tiles.length - 1) * GAP;
const html = `<!doctype html><html><body style="margin:0;background:transparent">
  <div style="display:flex;gap:${GAP}px">
    ${tiles.map((src) => `<img src="${src}" style="width:${tileWidth}px;height:${HEIGHT}px;border-radius:18px">`).join('')}
  </div></body></html>`;

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width, height: HEIGHT }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'load' });
  await page.screenshot({ path: OUT, omitBackground: true });
} finally {
  await browser.close();
}

const size = imageSize(fs.readFileSync(OUT));
if (size.width !== width || size.height !== HEIGHT) {
  throw new Error(`panorama exported at ${size.width}x${size.height}, expected ${width}x${HEIGHT}`);
}
process.stdout.write(`${path.relative(ROOT, OUT)} (${width}x${HEIGHT})\n`);

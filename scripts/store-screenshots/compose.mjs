import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { imageSize } from 'image-size';
import { CAPTIONS, SCREEN_ORDER } from './captions.js';
import { slotHtml, DEFAULT_FONTS } from './template.js';

const ROOT = process.cwd();
const RAW_ROOT = path.join(ROOT, 'fastlane', 'screenshots_raw');
const IOS_ROOT = path.join(ROOT, 'fastlane', 'screenshots', 'ios');
const PLAY_IMAGES = path.join(ROOT, 'fastlane', 'metadata', 'android', 'images');
const LOGO = path.join(ROOT, 'assets', 'images', 'cestapp-logo.png');

const LOCALES = [
  { raw: 'en', store: 'en-US' },
  { raw: 'es', store: 'es-ES' },
];
const SLOTS = [
  {
    id: 'ios-phone',
    device: 'iphone',
    width: 1290,
    height: 2796,
    dirFor: (store) => path.join(IOS_ROOT, store),
  },
  {
    id: 'play-phone',
    device: 'iphone',
    width: 1080,
    height: 2340,
    dirFor: (store) => path.join(PLAY_IMAGES, store, 'phoneScreenshots'),
  },
  {
    id: 'play-tablet',
    device: 'ipad',
    width: 2048,
    height: 2732,
    dirFor: (store) => path.join(PLAY_IMAGES, store, 'tenInchScreenshots'),
  },
];

for (const [name, file] of Object.entries(DEFAULT_FONTS)) {
  if (!fs.existsSync(file)) throw new Error(`Missing ${name} font TTF: ${file}`);
}
if (!fs.existsSync(LOGO)) throw new Error(`Missing logo asset: ${LOGO}`);

const dataUri = (file, mime) => `data:${mime};base64,${fs.readFileSync(file).toString('base64')}`;

async function renderPage(browser, html, outPath, width, height) {
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: 1,
  });
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready.then(() => true));
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  await page.screenshot({ path: outPath });
  await page.close();
}

function iconHtml(logoDataUri) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      html,
      body {
        width: 512px;
        height: 512px;
        overflow: hidden;
        background: #fffde1;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      img {
        width: 70%;
        height: auto;
      }
    </style>
  </head>
  <body>
    <img src="${logoDataUri}" />
  </body>
</html>`;
}

function featureGraphicHtml(wordmarkDataUri) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      @font-face {
        font-family: 'Inter';
        font-style: normal;
        font-weight: 700;
        src: url('${wordmarkDataUri}') format('truetype');
      }
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      html,
      body {
        width: 1024px;
        height: 500px;
        overflow: hidden;
        background: linear-gradient(115deg, #3d6b23 0%, #93bd57 100%);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        -webkit-font-smoothing: antialiased;
      }
      .wordmark {
        font-family: 'Inter', sans-serif;
        font-weight: 700;
        color: #ffffff;
        font-size: 116px;
        letter-spacing: -0.02em;
        line-height: 1.1;
      }
      .subline {
        margin-top: 22px;
        font-family: 'Inter', sans-serif;
        font-weight: 700;
        color: rgba(255, 255, 255, 0.65);
        font-size: 34px;
        letter-spacing: 0.01em;
      }
    </style>
  </head>
  <body>
    <div class="wordmark">CestApp</div>
    <div class="subline">Receipt scanner &middot; Esc&aacute;ner de tickets</div>
  </body>
</html>`;
}

const missingRaws = LOCALES.flatMap((locale) =>
  SLOTS.flatMap((slot) =>
    SCREEN_ORDER.map((screenId) => path.join(RAW_ROOT, locale.raw, slot.device, `${screenId}.png`))
  )
).filter((rawPath) => !fs.existsSync(rawPath));
if (missingRaws.length > 0) {
  throw new Error(`Missing ${missingRaws.length} raw capture(s):\n${missingRaws.join('\n')}`);
}

const browser = await chromium.launch();
const written = [];
try {
  for (const locale of LOCALES) {
    const shots = {};
    for (const slot of SLOTS) {
      for (const screenId of SCREEN_ORDER) {
        const rawPath = path.join(RAW_ROOT, locale.raw, slot.device, `${screenId}.png`);
        const shotKey = `${slot.device}/${screenId}`;
        if (!shots[shotKey]) shots[shotKey] = dataUri(rawPath, 'image/png');
        const html = slotHtml({
          caption: CAPTIONS[screenId][locale.raw],
          shotDataUri: shots[shotKey],
          width: slot.width,
          height: slot.height,
          fonts: DEFAULT_FONTS,
        });
        const outPath = path.join(slot.dirFor(locale.store), `${screenId}.png`);
        await renderPage(browser, html, outPath, slot.width, slot.height);
        written.push({ outPath, width: slot.width, height: slot.height });
      }
    }
  }

  const iconPath = path.join(ROOT, 'fastlane', 'metadata', 'android', 'icon.png');
  await renderPage(browser, iconHtml(dataUri(LOGO, 'image/png')), iconPath, 512, 512);
  written.push({ outPath: iconPath, width: 512, height: 512 });

  const featurePath = path.join(PLAY_IMAGES, 'featureGraphic.png');
  await renderPage(
    browser,
    featureGraphicHtml(dataUri(DEFAULT_FONTS.bold, 'font/ttf')),
    featurePath,
    1024,
    500
  );
  written.push({ outPath: featurePath, width: 1024, height: 500 });
} finally {
  await browser.close();
}

let mismatches = 0;
for (const { outPath, width, height } of written) {
  const dims = imageSize(fs.readFileSync(outPath));
  const ok = dims.width === width && dims.height === height;
  console.log(
    `${ok ? 'OK  ' : 'FAIL'} ${path.relative(ROOT, outPath)} ${dims.width}x${dims.height}`
  );
  if (!ok) mismatches += 1;
}
if (mismatches > 0) {
  console.error(`${mismatches} of ${written.length} outputs at the wrong size`);
  process.exitCode = 1;
} else {
  console.log(`Composed ${written.length} graphics at exact sizes.`);
}

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { imageSize } from 'image-size';
import { CAPTIONS, SCREEN_ORDER } from './captions.js';
import { deviceProfile } from './devices.js';
import { featureGraphicHtml, iconHtml } from './graphics.js';
import { LOCALES, PLAY_IMAGES, SLOTS } from './slots.js';
import { slotHtml } from './template.js';
import { assertAssets } from './theme.js';

const ROOT = process.cwd();
const RAW_ROOT = path.join(ROOT, 'fastlane', 'screenshots_raw');

/** How far the rendered screen may drift from the capture's aspect ratio. */
const ASPECT_TOLERANCE = 0.005;

const rel = (p) => path.relative(ROOT, p);

assertAssets();

/**
 * Every capture, checked before a browser is launched: present, and shot on the
 * simulator its device profile describes. A capture from a different simulator
 * has a different status-bar height, and cropping the profile's strip out of it
 * would silently eat a slice of the app.
 */
function collectRaws() {
  const devices = [...new Set(SLOTS.map((slot) => slot.device))];
  const raws = new Map();
  const problems = [];

  for (const locale of LOCALES) {
    for (const deviceKey of devices) {
      const profile = deviceProfile(deviceKey);
      for (const screenId of SCREEN_ORDER) {
        const file = path.join(RAW_ROOT, locale.raw, deviceKey, `${screenId}.png`);
        if (!fs.existsSync(file)) {
          problems.push(`missing: ${rel(file)}`);
          continue;
        }
        const buffer = fs.readFileSync(file);
        const size = imageSize(buffer);
        if (size.width !== profile.raw.width || size.height !== profile.raw.height) {
          problems.push(
            `${rel(file)} is ${size.width}x${size.height}, expected ` +
              `${profile.raw.width}x${profile.raw.height} (${profile.label}). ` +
              `Recapture on that simulator, or update its profile in devices.js ` +
              `— statusStrip must be remeasured too.`
          );
          continue;
        }
        raws.set(`${locale.raw}/${deviceKey}/${screenId}`, {
          uri: `data:image/png;base64,${buffer.toString('base64')}`,
          width: size.width,
          height: size.height,
        });
      }
    }
  }

  if (problems.length > 0) {
    throw new Error(`${problems.length} raw capture problem(s):\n  ${problems.join('\n  ')}`);
  }
  return raws;
}

async function renderPage(browser, html, outPath, width, height, prepare) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  try {
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready.then(() => true));
    const report = prepare ? await prepare(page) : null;
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    await page.screenshot({ path: outPath });
    return report;
  } finally {
    await page.close();
  }
}

/**
 * The composition's own contract: the whole capture is on the tile, at its own
 * aspect ratio, inside the canvas. Violating any of it means a cropped or
 * clipped screenshot, which is the defect this rewrite exists to remove.
 */
function verifyTile({ label, report, slot, raw }) {
  const faults = [];
  const wanted = raw.width / raw.height;
  const got = report.screen.width / report.screen.height;
  if (Math.abs(got - wanted) / wanted > ASPECT_TOLERANCE) {
    faults.push(`screen aspect ${got.toFixed(5)} != capture aspect ${wanted.toFixed(5)}`);
  }
  if (report.natural.width !== raw.width || report.natural.height !== raw.height) {
    faults.push(
      `capture decoded at ${report.natural.width}x${report.natural.height}, ` +
        `expected ${raw.width}x${raw.height}`
    );
  }
  const { left, top, right, bottom } = report.device;
  if (left < -0.5 || top < -0.5 || right > slot.width + 0.5 || bottom > slot.height + 0.5) {
    faults.push(
      `device escapes the canvas: [${left.toFixed(1)}, ${top.toFixed(1)}, ` +
        `${right.toFixed(1)}, ${bottom.toFixed(1)}] vs ${slot.width}x${slot.height}`
    );
  }
  if (report.captionLines > 2) {
    faults.push(`caption wraps to ${report.captionLines} lines`);
  }
  return faults.map((fault) => `${label}: ${fault}`);
}

const raws = collectRaws();
const browser = await chromium.launch();
const written = [];
const faults = [];

try {
  for (const locale of LOCALES) {
    for (const slot of SLOTS) {
      const device = deviceProfile(slot.device);
      for (const screenId of SCREEN_ORDER) {
        const raw = raws.get(`${locale.raw}/${slot.device}/${screenId}`);
        const html = slotHtml({
          caption: CAPTIONS[screenId][locale.raw],
          shotDataUri: raw.uri,
          slot,
          device,
          raw,
        });
        const outPath = path.join(ROOT, slot.dirFor(locale.store), slot.fileFor(screenId));
        const sampleY = device.statusStrip + 4;
        const report = await renderPage(browser, html, outPath, slot.width, slot.height, (page) =>
          page.evaluate((y) => window.__prepare(y), sampleY)
        );
        faults.push(
          ...verifyTile({ label: `${slot.id}/${locale.raw}/${screenId}`, report, slot, raw })
        );
        written.push({ outPath, width: slot.width, height: slot.height });
      }
    }
  }

  const iconPath = path.join(ROOT, 'fastlane', 'metadata', 'android', 'icon.png');
  await renderPage(browser, iconHtml(), iconPath, 512, 512);
  written.push({ outPath: iconPath, width: 512, height: 512 });

  const featurePath = path.join(ROOT, PLAY_IMAGES, 'featureGraphic.png');
  await renderPage(browser, featureGraphicHtml(), featurePath, 1024, 500);
  written.push({ outPath: featurePath, width: 1024, height: 500 });
} finally {
  await browser.close();
}

for (const { outPath, width, height } of written) {
  const dims = imageSize(fs.readFileSync(outPath));
  if (dims.width !== width || dims.height !== height) {
    faults.push(
      `${rel(outPath)} exported at ${dims.width}x${dims.height}, expected ${width}x${height}`
    );
  }
}

if (faults.length > 0) {
  console.error(`${faults.length} problem(s) in ${written.length} graphics:`);
  for (const fault of faults) console.error(`  ${fault}`);
  process.exitCode = 1;
} else {
  console.log(`Composed ${written.length} graphics; every capture whole and at size.`);
}

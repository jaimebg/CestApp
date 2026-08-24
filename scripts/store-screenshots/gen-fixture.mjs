import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, 'fixtures/sample-ticket.png');
mkdirSync(path.dirname(out), { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 640, height: 1200 },
  deviceScaleFactor: 2,
});
await page.goto(pathToFileURL(path.join(here, 'fixtures/receipt.html')).href);
await page.screenshot({ path: out, fullPage: true });
await browser.close();
console.log(out);

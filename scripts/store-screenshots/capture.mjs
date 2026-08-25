import { execSync } from 'node:child_process';
import readline from 'node:readline/promises';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const RAW = path.resolve('fastlane/screenshots_raw');
const APP = 'com.jbgsoft.CestApp';
const DEVICES = [
  { key: 'iphone', udid: process.env.IOS_SIM_UDID },
  { key: 'ipad', udid: process.env.IPAD_SIM_UDID },
].filter((device) => device.udid);
if (DEVICES.length === 0) throw new Error('Set IOS_SIM_UDID / IPAD_SIM_UDID');

const SCREENS = [
  { id: '01_dashboard', url: 'cestapp:///' },
  { id: '02_review', guided: true },
  { id: '03_history', url: 'cestapp:///history' },
  { id: '04_analytics', url: 'cestapp:///analytics' },
  { id: '05_reading', guided: true },
  { id: '06_settings', url: 'cestapp:///settings' },
];
const LOCALES = ['en', 'es'];
const run = (cmd) => execSync(cmd, { stdio: 'inherit' });
const ask = async (question) => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  await rl.question(question);
  rl.close();
};

/**
 * `simctl` has no rotate command, so this drives the Simulator UI directly:
 * Cmd+Right (key code 124) rotates the frontmost simulator one turn clockwise.
 * That needs Accessibility permission for the terminal running this script, so
 * a manual fallback prompt covers the case where it isn't granted.
 */
const rotateToLandscape = async (device) => {
  if (device.key !== 'ipad') return;
  try {
    execSync(
      `osascript -e 'tell application "Simulator" to activate' ` +
        `-e 'tell application "System Events" to key code 124 using command down'`,
      { stdio: 'ignore' }
    );
  } catch {
    await ask('Rotate the iPad simulator to landscape (Cmd+Right arrow), then Enter…');
  }
};

for (const device of DEVICES) {
  await rotateToLandscape(device);
  const appPath = await ask(
    `Path to the installed ${device.key} .app bundle (drag into terminal, empty to skip reinstall): `
  );
  for (const locale of LOCALES) {
    if (appPath.trim()) {
      run(`xcrun simctl bootstatus ${device.udid} -b`);
      run(`xcrun simctl uninstall ${device.udid} ${APP}`);
      run(`xcrun simctl install ${device.udid} "${appPath.trim()}"`);
      run(`xcrun simctl addmedia ${device.udid} ${path.join(here, 'fixtures/sample-ticket.png')}`);
      run(
        `xcrun simctl spawn ${device.udid} defaults write -g AppleLanguages "(${locale === 'es' ? 'es-ES' : 'en-US'})"`
      );
      run(
        `xcrun simctl spawn ${device.udid} defaults write -g AppleLocale "${locale === 'es' ? 'es_ES' : 'en_US'}"`
      );
      console.log(
        `Launch the app once, seed demo data (Settings → tap version ×5 → Add demo data), then press Enter…`
      );
      await ask('');
    }
    run(
      `xcrun simctl status_bar ${device.udid} override --time "9:41" --batteryLevel 100 --wifiBars 3 --cellularBars 4`
    );
    for (const screen of SCREENS) {
      if (screen.guided) {
        await ask(
          screen.id === '02_review'
            ? `Open the sample ticket scan so REVIEW shows a parsed receipt (${device.key}/${locale}), then Enter…`
            : `Open ReadingModal over that same receipt (${device.key}/${locale}), then Enter…`
        );
      } else {
        run(`xcrun simctl openurl ${device.udid} ${screen.url}`);
        await new Promise((r) => setTimeout(r, 3000));
      }
      const dir = path.join(RAW, locale, device.key);
      fs.mkdirSync(dir, { recursive: true });
      run(`xcrun simctl io ${device.udid} screenshot ${path.join(dir, `${screen.id}.png`)}`);
    }
  }
}
console.log(`Raw captures in ${RAW}`);

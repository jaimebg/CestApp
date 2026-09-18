import { execSync } from 'node:child_process';
import readline from 'node:readline/promises';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RAW_LOCALE } from './slots.js';

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
const run = (cmd) => execSync(cmd, { stdio: 'inherit' });
const ask = async (question) => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  await rl.question(question);
  rl.close();
};

for (const device of DEVICES) {
  const appPath = await ask(
    `Path to the installed ${device.key} .app bundle (drag into terminal, empty to skip reinstall): `
  );
  if (appPath.trim()) {
    run(`xcrun simctl bootstatus ${device.udid} -b`);
    run(`xcrun simctl uninstall ${device.udid} ${APP}`);
    run(`xcrun simctl install ${device.udid} "${appPath.trim()}"`);
    run(`xcrun simctl addmedia ${device.udid} ${path.join(here, 'fixtures/sample-ticket.png')}`);
    run(`xcrun simctl spawn ${device.udid} defaults write -g AppleLanguages "(es-ES)"`);
    run(`xcrun simctl spawn ${device.udid} defaults write -g AppleLocale "es_ES"`);
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
          ? `Open the sample ticket scan so REVIEW shows a parsed receipt (${device.key}), then Enter…`
          : `Open ReadingModal over that same receipt (${device.key}), then Enter…`
      );
    } else {
      run(`xcrun simctl openurl ${device.udid} ${screen.url}`);
      await new Promise((r) => setTimeout(r, 3000));
    }
    const dir = path.join(RAW, RAW_LOCALE, device.key);
    fs.mkdirSync(dir, { recursive: true });
    run(`xcrun simctl io ${device.udid} screenshot ${path.join(dir, `${screen.id}.png`)}`);
  }
}
console.log(`Raw captures in ${RAW}`);

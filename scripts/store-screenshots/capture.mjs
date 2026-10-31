// Captures the raw store screenshots on Android emulators, with no manual step:
// boots the phone and tablet AVDs named in devices.js, builds a release APK in
// screenshot mode (EXPO_PUBLIC_SCREENSHOTS=1), seeds the demo data and opens each
// screen through cestapp:///screenshots deep links. Run with `npm run shots:capture`.
//
// The screenshot-mode JS bundle is wiped from android/ when the run ends, so a
// later store build can never pick it up.
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEVICES } from './devices.js';
import { RAW_LOCALE } from './slots.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = process.cwd();
const RAW = path.join(ROOT, 'fastlane', 'screenshots_raw', RAW_LOCALE);
const PACKAGE = 'com.jbgsoft.cestapp';
const APK = path.join(ROOT, 'android/app/build/outputs/apk/release/app-release.apk');
const TICKET = path.join(here, 'fixtures/sample-ticket.png');
const DEVICE_TICKET = `/sdcard/Android/data/${PACKAGE}/files/sample-ticket.png`;
const TICKET_URI = encodeURIComponent(`file://${DEVICE_TICKET}`);
const DEVICE_MARKER = `/sdcard/Android/data/${PACKAGE}/files/screenshots.enabled`;
const SDK = process.env.ANDROID_HOME || path.join(os.homedir(), 'Library/Android/sdk');

const SCREENS = [
  { id: '01_dashboard', url: 'cestapp:///' },
  { id: '02_review', url: `cestapp:///screenshots?step=review&uri=${TICKET_URI}` },
  { id: '03_history', url: 'cestapp:///history' },
  { id: '04_analytics', url: 'cestapp:///analytics' },
  { id: '05_reading', url: `cestapp:///screenshots?step=reading&uri=${TICKET_URI}` },
  { id: '06_settings', url: 'cestapp:///settings' },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const log = (message) => process.stdout.write(`${message}\n`);

function run(command, args, options = {}) {
  return execFileSync(command, args, { stdio: 'inherit', ...options });
}

function adb(serial, args, options = {}) {
  return execFileSync('adb', ['-s', serial, ...args], { maxBuffer: 64 * 1024 * 1024, ...options });
}

function emulatorSerials() {
  return execFileSync('adb', ['devices'])
    .toString()
    .split('\n')
    .map((line) => line.split('\t'))
    .filter(([serial, state]) => serial.startsWith('emulator-') && state === 'device')
    .map(([serial]) => serial);
}

function avdName(serial) {
  try {
    return adb(serial, ['emu', 'avd', 'name']).toString().split(/\r?\n/)[0].trim();
  } catch {
    return null;
  }
}

const AVDMANAGER = path.join(SDK, 'cmdline-tools', 'latest', 'bin', 'avdmanager');

/**
 * The capture AVDs belong to this script, never to day-to-day development: it
 * creates them on first use, pins them upright, wipes the app on them, and shuts
 * them down when it is done.
 */
function ensureAvd(profile) {
  const avds = execFileSync(path.join(SDK, 'emulator', 'emulator'), ['-list-avds'])
    .toString()
    .split('\n')
    .map((name) => name.trim());
  if (!avds.includes(profile.avd)) {
    log(`Creating AVD ${profile.avd}…`);
    run('sh', [
      '-c',
      `echo no | "${AVDMANAGER}" create avd -n ${profile.avd} -k "${profile.systemImage}" -d ${profile.hardware}`,
    ]);
  }

  const config = path.join(os.homedir(), '.android', 'avd', `${profile.avd}.avd`, 'config.ini');
  // An upright panel of the capture size: rotating a landscape-native tablet
  // does not hold once an app starts, but a portrait panel needs no rotation.
  const pinned = {
    'hw.lcd.width': profile.raw.width,
    'hw.lcd.height': profile.raw.height,
    'hw.initialOrientation': 'portrait',
    'skin.name': `${profile.raw.width}x${profile.raw.height}`,
    'skin.path': '_no_skin',
  };
  const lines = fs
    .readFileSync(config, 'utf8')
    .split('\n')
    .filter((line) => line && !(line.split('=')[0] in pinned));
  const pins = Object.entries(pinned).map(([key, value]) => `${key}=${value}`);
  fs.writeFileSync(config, `${[...lines, ...pins].join('\n')}\n`);
}

async function bootedSerial(profile) {
  const running = emulatorSerials().find((serial) => avdName(serial) === profile.avd);
  if (running) return running;

  ensureAvd(profile);
  log(`Booting ${profile.avd}…`);
  spawn(
    path.join(SDK, 'emulator', 'emulator'),
    ['-avd', profile.avd, '-no-snapshot', '-no-boot-anim', '-no-audio'],
    { detached: true, stdio: 'ignore' }
  ).unref();

  for (let waited = 0; waited < 300_000; waited += 2000) {
    await sleep(2000);
    const serial = emulatorSerials().find((s) => avdName(s) === profile.avd);
    if (
      serial &&
      adb(serial, ['shell', 'getprop', 'sys.boot_completed']).toString().trim() === '1'
    ) {
      await sleep(5000);
      return serial;
    }
  }
  throw new Error(`${profile.avd} did not boot within 5 minutes`);
}

function shutDown(serial) {
  try {
    adb(serial, ['emu', 'kill'], { stdio: 'ignore', timeout: 15_000 });
  } catch {
    log(`  could not shut down ${serial}; close it by hand`);
  }
}

function buildScreenshotApk() {
  log('Building the screenshot-mode release APK…');
  run('npx', ['expo', 'prebuild', '--platform', 'android', '--no-install']);
  run('./gradlew', ['app:assembleRelease', '-PreactNativeArchitectures=arm64-v8a'], {
    cwd: path.join(ROOT, 'android'),
    env: { ...process.env, EXPO_PUBLIC_SCREENSHOTS: '1' },
  });
}

function wipeScreenshotBuild() {
  log('Wiping the screenshot-mode build from android/…');
  run('./gradlew', ['app:clean'], { cwd: path.join(ROOT, 'android') });
}

function openUrl(serial, url) {
  adb(
    serial,
    ['shell', 'am', 'start', '-W', '-a', 'android.intent.action.VIEW', '-d', `'${url}'`, PACKAGE],
    {
      stdio: 'ignore',
    }
  );
}

function screencap(serial) {
  return adb(serial, ['exec-out', 'screencap', '-p']);
}

/** Waits until two captures in a row are identical: animations and loading have settled. */
async function stillCapture(serial, minWaitMs) {
  await sleep(minWaitMs);
  let previous = screencap(serial);
  for (let waited = 0; waited < 20_000; waited += 800) {
    await sleep(800);
    const current = screencap(serial);
    if (current.equals(previous)) return current;
    previous = current;
  }
  log('  screen never settled in 20 s; keeping the last capture');
  return previous;
}

function displaySize(png) {
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

/** Starts the app plainly. Right after boot the package manager can lag, so it retries. */
async function launchApp(serial) {
  for (let attempt = 1; ; attempt++) {
    try {
      adb(serial, ['shell', 'am', 'start', '-W', '-n', `${PACKAGE}/.MainActivity`], {
        stdio: 'ignore',
      });
      return;
    } catch (error) {
      if (attempt === 5) throw error;
      await sleep(3000);
    }
  }
}

function prepareDevice(serial) {
  adb(serial, [
    'shell',
    'cmd',
    'overlay',
    'enable',
    'com.android.internal.systemui.navbar.gestural',
  ]);
  adb(serial, ['shell', 'settings', 'put', 'system', 'accelerometer_rotation', '1']);
  adb(serial, ['install', '-r', APK], { stdio: 'ignore' });
  adb(serial, ['shell', 'pm', 'clear', PACKAGE], { stdio: 'ignore' });
  adb(serial, ['shell', 'mkdir', '-p', path.posix.dirname(DEVICE_TICKET)]);
  adb(serial, ['push', TICKET, DEVICE_TICKET], { stdio: 'ignore' });
  adb(serial, ['shell', 'touch', DEVICE_MARKER]);
}

function assertDisplay(png, profile) {
  const { width, height } = displaySize(png);
  if (width !== profile.raw.width || height !== profile.raw.height) {
    throw new Error(
      `${profile.label} captured at ${width}x${height}, expected ${profile.raw.width}x${profile.raw.height}. ` +
        'Check the AVD and its rotation, or update its profile in devices.js (and remeasure statusStrip).'
    );
  }
}

async function captureDevice(key, profile) {
  const serial = await bootedSerial(profile);
  log(`${key}: ${profile.avd} on ${serial}`);
  prepareDevice(serial);

  // A deep link that cold-starts the app is not reliably delivered to its
  // route, so the app is launched plainly first and set up once it is running.
  await launchApp(serial);
  await stillCapture(serial, 4000);
  openUrl(serial, 'cestapp:///screenshots?step=setup');
  await stillCapture(serial, 6000);

  const dir = path.join(RAW, key);
  fs.mkdirSync(dir, { recursive: true });
  for (const screen of SCREENS) {
    openUrl(serial, screen.url);
    const png = await stillCapture(serial, screen.url.includes('step=') ? 6000 : 2500);
    assertDisplay(png, profile);
    fs.writeFileSync(path.join(dir, `${screen.id}.png`), png);
    log(`  ${screen.id}`);
  }
  shutDown(serial);
}

// finally does not run when the process is interrupted, and a screenshot
// bundle left in android/ could be picked up by the next store build.
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(signal, () => {
    wipeScreenshotBuild();
    process.exit(130);
  });
}

try {
  buildScreenshotApk();
  for (const [key, profile] of Object.entries(DEVICES)) {
    await captureDevice(key, profile);
  }
  log(`Raw captures in ${path.relative(ROOT, RAW)}`);
} finally {
  wipeScreenshotBuild();
}

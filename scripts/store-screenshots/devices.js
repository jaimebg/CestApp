import { px } from './theme.js';

/**
 * Capture-source profiles.
 *
 * `statusStrip` is how many pixels of the raw PNG the system status bar
 * occupies. Compose crops exactly that much away and paints a synthetic bar of
 * the same height in its place, which fixes two defects in the captures without
 * re-shooting them: the clock reads whatever time the run happened at rather
 * than 9:41, and the English iPad captures carry a Spanish system status bar.
 *
 * `raw` is asserted against every capture before composing. Recapturing on a
 * different simulator changes both numbers, so the run fails loudly rather than
 * silently slicing a strip out of the wrong place.
 */
export const DEVICES = {
  iphone: {
    label: 'iPhone 16 Pro Max',
    raw: { width: 1320, height: 2868 }, //  440x956pt @3x
    statusStrip: 186, //                     62pt top safe-area inset @3x
    kind: 'phone',
    bezelRatio: 0.026,
    cornerRatio: 0.118, //                   55pt of 440pt
  },
  ipad: {
    label: 'iPad Pro 11-inch (M4), landscape',
    raw: { width: 2266, height: 1488 }, // 1133x744pt @2x
    statusStrip: 48, //                     24pt status bar @2x
    kind: 'tablet',
    bezelRatio: 0.02,
    cornerRatio: 0.055,
  },
};

export function deviceProfile(key) {
  const profile = DEVICES[key];
  if (!profile) throw new Error(`Unknown device "${key}"`);
  return profile;
}

const svg = (viewBox, body, size) =>
  `<svg viewBox="${viewBox}" width="${size.w}" height="${size.h}" fill="none" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;

function cellularIos(h) {
  const bars = [0.42, 0.6, 0.8, 1]
    .map((scale, i) => {
      const barH = 11 * scale;
      return `<rect x="${i * 4.6}" y="${11 - barH}" width="3.2" height="${barH}" rx="1" fill="currentColor" />`;
    })
    .join('');
  return svg('0 0 17 11', bars, { w: (h * 17) / 11, h });
}

function wifiIos(h) {
  return svg(
    '0 0 16 11.5',
    `<path d="M8 10.6 5.6 7.9a3.7 3.7 0 0 1 4.8 0L8 10.6Z" fill="currentColor"/>
     <path d="M3.5 5.7a6.9 6.9 0 0 1 9 0" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
     <path d="M1.1 3.1a10.4 10.4 0 0 1 13.8 0" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>`,
    { w: (h * 16) / 11.5, h }
  );
}

function batteryIos(h) {
  return svg(
    '0 0 27 12',
    `<rect x="0.6" y="0.6" width="23" height="10.8" rx="3.2" stroke="currentColor" stroke-width="1.1" opacity="0.4"/>
     <rect x="2.2" y="2.2" width="19.8" height="7.6" rx="1.9" fill="currentColor"/>
     <path d="M25.2 4.2c1 .4 1.4 1 1.4 1.8s-.4 1.4-1.4 1.8V4.2Z" fill="currentColor" opacity="0.45"/>`,
    { w: (h * 27) / 12, h }
  );
}

function signalAndroid(h) {
  return svg(
    '0 0 14 12',
    `<path d="M13 1v10a.6.6 0 0 1-.6.6H1.3a.6.6 0 0 1-.4-1L12 .6a.6.6 0 0 1 1 .4Z" fill="currentColor"/>`,
    { w: (h * 14) / 12, h }
  );
}

function wifiAndroid(h) {
  return svg(
    '0 0 15 12',
    `<path d="M7.5 11.6.5 3.9a10.5 10.5 0 0 1 14 0l-7 7.7Z" fill="currentColor"/>`,
    { w: (h * 15) / 12, h }
  );
}

function batteryAndroid(h) {
  return svg(
    '0 0 9 14',
    `<path d="M3 0h3v1.4h1.2A1.3 1.3 0 0 1 8.5 2.7v10A1.3 1.3 0 0 1 7.2 14H1.8A1.3 1.3 0 0 1 .5 12.7v-10A1.3 1.3 0 0 1 1.8 1.4H3V0Z" fill="currentColor"/>`,
    { w: (h * 9) / 14, h }
  );
}

/**
 * Synthetic status bar sized to a band of `width` x `height` output pixels.
 *
 * Its background is not baked in: the page samples the capture's first content
 * row at load and paints the bar to match, so the seam is invisible whether the
 * screen below is cream or the Settings modal's dimmed backdrop.
 *
 * The Play tiles are composed from the same iOS captures, so `platform` decides
 * the chrome — a Dynamic Island and iOS glyphs for the App Store slots, a
 * punch-hole camera and Android glyphs for the Play ones.
 */
export function statusBarHtml({ platform, kind, width, height }) {
  const ios = platform === 'ios';
  const phone = kind === 'phone';

  /*
   * On a real iPad the status bar's side inset is close to constant in
   * points regardless of orientation — it is not a percentage of screen
   * width. `TABLET_STATUS_PAD_RATIO` is that inset expressed as a multiple
   * of the bar's own height instead, so it holds its proportion whichever
   * way the device is turned. The multiplier reproduces the padding of the
   * portrait iPad tile that was already reviewed and accepted: on the
   * 2048x2732 portrait canvas the bar rendered at 43.6px tall with a 47.3px
   * pad (screenWidth * 0.035), a 1.085 ratio. Applied to the ~45.0px bar of
   * the 2732x2048 landscape canvas that gives a ~48.9px pad — close to the
   * old 47.3px, as intended, instead of the ~74.4px that width * 0.035
   * would have produced on the wider landscape screen.
   */
  const TABLET_STATUS_PAD_RATIO = 1.085;

  const padLeft = phone ? width * (ios ? 0.09 : 0.062) : height * TABLET_STATUS_PAD_RATIO;
  const padRight = phone ? width * (ios ? 0.063 : 0.052) : height * TABLET_STATUS_PAD_RATIO;
  const fontSize = height * (phone ? (ios ? 0.274 : 0.235) : 0.46);
  const glyph = height * (phone ? (ios ? 0.185 : 0.16) : 0.3);
  const gap = width * (phone ? 0.017 : 0.011);

  const cluster = ios
    ? [cellularIos(glyph), wifiIos(glyph), batteryIos(glyph * 1.05)]
    : [wifiAndroid(glyph), signalAndroid(glyph), batteryAndroid(glyph * 1.2)];

  const notch =
    ios && phone
      ? `<div class="island" style="
           width: ${px(width * 0.284)};
           height: ${px(height * 0.597)};
           top: ${px(height * 0.177)};
           border-radius: ${px(height * 0.3)};
         "></div>`
      : !ios && phone
        ? `<div class="punch-hole" style="
             width: ${px(width * 0.05)};
             height: ${px(width * 0.05)};
             top: ${px(height * 0.5 - width * 0.025)};
           "></div>`
        : '';

  return `<div class="statusbar" style="
      height: ${px(height)};
      padding-left: ${px(padLeft)};
      padding-right: ${px(padRight)};
      font-size: ${px(fontSize)};
      font-weight: ${ios ? 600 : 500};
      letter-spacing: ${ios ? '0.01em' : '0'};
    ">
      ${notch}
      <span class="clock">9:41</span>
      <span class="glyphs" style="gap: ${px(gap)}">${cluster.join('')}</span>
    </div>`;
}

export const STATUS_BAR_CSS = `
  .statusbar {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    z-index: 2;
    background: var(--statusbar-bg, #fffde1);
    color: var(--statusbar-ink, #1a1918);
    font-family: 'Inter', sans-serif;
    font-variant-numeric: tabular-nums;
  }
  .statusbar .glyphs {
    display: flex;
    align-items: center;
  }
  .statusbar .island {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    background: #000;
  }
  .statusbar .punch-hole {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    border-radius: 50%;
    background: #000;
  }
`;

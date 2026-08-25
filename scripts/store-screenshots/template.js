import { BRAND, escapeHtml, fontFaces, px } from './theme.js';
import { statusBarHtml, STATUS_BAR_CSS } from './devices.js';
import { fitDevice, screenBands, stageBox } from './geometry.js';

/**
 * Caption band proportions, per device kind. The iPad slots are permanently
 * landscape, so the tablet entry is `tabletLandscape`, not `tablet`: the
 * canvas is wider, so `size` (a fraction of canvas width) is smaller than a
 * portrait tablet's would be, to keep the caption from overrunning two lines.
 */
const CAPTION = {
  phone: { top: 0.062, band: 0.105, gap: 0.022, size: 0.082, rule: 0.005 },
  tabletLandscape: { top: 0.06, band: 0.105, gap: 0.022, size: 0.045, rule: 0.005 },
};

/**
 * One store tile: caption, rule, and a framed device holding the whole capture.
 *
 * `fitDevice` sizes the screen to the capture's own aspect ratio, so the shot is
 * always rendered complete. The only pixels removed are the capture's system
 * status bar, which `screenBands` replaces with a synthetic one of the same
 * height.
 */
export function slotHtml({ caption, shotDataUri, slot, device, raw }) {
  const { width, height, insets, platform } = slot;
  const kind = device.kind;
  const captionKey = device.kind === 'tablet' ? 'tabletLandscape' : device.kind;
  const c = CAPTION[captionKey];

  const { stageWidth, stageHeight, stageLeft, stageTop } = stageBox({ width, height, insets });
  const screenAspect = raw.width / raw.height;
  const frame = fitDevice({
    stageWidth,
    stageHeight,
    screenAspect,
    bezelRatio: device.bezelRatio,
  });
  const bands = screenBands({
    screenWidth: frame.screenWidth,
    screenHeight: frame.screenHeight,
    rawHeight: raw.height,
    statusStrip: device.statusStrip,
  });

  const deviceLeft = stageLeft + (stageWidth - frame.deviceWidth) / 2;
  const deviceTop = stageTop + (stageHeight - frame.deviceHeight) / 2;
  const deviceRadius = frame.deviceWidth * device.cornerRatio;
  const screenRadius = Math.max(0, deviceRadius - frame.bezel);

  const captionTop = height * c.top;
  const captionBand = height * c.band;
  const ruleTop = captionTop + captionBand + height * c.gap;

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      ${fontFaces()}
      ${STATUS_BAR_CSS}
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      html,
      body {
        width: ${px(width)};
        height: ${px(height)};
        overflow: hidden;
        -webkit-font-smoothing: antialiased;
      }
      /*
       * Warm at the top so the caption keeps its 6.13:1 on cream, cooling into
       * brand green under the device. The golden note is kept to one corner and
       * away from the green: overlap the two and the tile turns olive.
       */
      body {
        position: relative;
        background:
          radial-gradient(112% 58% at 50% 0%, #ffffff 0%, rgba(255, 255, 255, 0) 58%),
          radial-gradient(
            66% 36% at 97% 5%,
            rgba(251, 229, 128, 0.55),
            rgba(251, 229, 128, 0) 68%
          ),
          radial-gradient(104% 46% at 50% 104%, rgba(118, 165, 60, 0.78), rgba(118, 165, 60, 0) 72%),
          linear-gradient(
            180deg,
            ${BRAND.cream} 0%,
            #fbfae2 36%,
            #ecf1cc 64%,
            #d2e4ad 86%,
            #b3d387 100%
          );
      }
      .halo {
        position: absolute;
        left: 50%;
        top: ${px(deviceTop + frame.deviceHeight * 0.42)};
        width: ${px(frame.deviceWidth * 2.1)};
        height: ${px(frame.deviceHeight * 1.05)};
        transform: translate(-50%, -50%);
        border-radius: 50%;
        background: radial-gradient(
          closest-side,
          rgba(255, 255, 255, 0.75),
          rgba(255, 255, 255, 0.28) 48%,
          rgba(255, 255, 255, 0) 76%
        );
      }
      .caption-area {
        position: absolute;
        left: ${px(width * insets.left)};
        top: ${px(captionTop)};
        width: ${px(width * (1 - insets.left - insets.right))};
        height: ${px(captionBand)};
        display: flex;
        align-items: flex-end;
      }
      .caption {
        font-family: 'Inter', sans-serif;
        font-weight: 700;
        color: ${BRAND.deep};
        font-size: ${px(width * c.size)};
        line-height: 1.12;
        letter-spacing: -0.022em;
        text-wrap: balance;
      }
      .rule {
        position: absolute;
        left: ${px(width * insets.left)};
        top: ${px(ruleTop)};
        width: ${px(width * 0.115)};
        height: ${px(height * c.rule)};
        border-radius: ${px(height * c.rule)};
        background: ${BRAND.fresh};
      }
      .device {
        position: absolute;
        left: ${px(deviceLeft)};
        top: ${px(deviceTop)};
        width: ${px(frame.deviceWidth)};
        height: ${px(frame.deviceHeight)};
        padding: ${px(frame.bezel)};
        border-radius: ${px(deviceRadius)};
        background: linear-gradient(155deg, #3a3733 0%, ${BRAND.charcoal} 42%, #0d0c0b 100%);
        box-shadow:
          0 ${px(frame.deviceHeight * 0.012)} ${px(frame.deviceHeight * 0.03)}
            rgba(26, 25, 24, 0.24),
          0 ${px(frame.deviceHeight * 0.05)} ${px(frame.deviceHeight * 0.11)} rgba(61, 107, 35, 0.32);
      }
      .device::after {
        content: '';
        position: absolute;
        inset: ${px(frame.bezel * 0.28)};
        border-radius: ${px(deviceRadius - frame.bezel * 0.28)};
        border: ${px(Math.max(1, frame.bezel * 0.1))} solid rgba(255, 255, 255, 0.09);
        pointer-events: none;
      }
      .screen {
        position: relative;
        width: ${px(frame.screenWidth)};
        height: ${px(frame.screenHeight)};
        border-radius: ${px(screenRadius)};
        overflow: hidden;
        background: ${BRAND.cream};
      }
      .shot {
        position: absolute;
        left: 0;
        top: ${px(bands.statusBarHeight)};
        width: ${px(bands.shotRenderedWidth)};
        height: ${px(bands.shotWindowHeight)};
        overflow: hidden;
      }
      .shot img {
        position: absolute;
        left: 0;
        top: ${px(bands.shotOffsetY)};
        width: ${px(bands.shotRenderedWidth)};
        height: ${px(bands.shotRenderedHeight)};
        display: block;
      }
    </style>
  </head>
  <body>
    <div class="halo"></div>
    <div class="caption-area"><div class="caption">${escapeHtml(caption)}</div></div>
    <div class="rule"></div>
    <div class="device">
      <div class="screen">
        ${statusBarHtml({ platform, kind, width: frame.screenWidth, height: bands.statusBarHeight })}
        <div class="shot"><img src="${shotDataUri}" /></div>
      </div>
    </div>
    <script>
      /**
       * Runs once per tile before the screenshot is taken. Returns the numbers
       * compose asserts on, so a layout regression fails the run instead of
       * shipping a cropped tile.
       */
      window.__prepare = async function (sampleY) {
        const img = document.querySelector('.shot img');
        await img.decode();

        // Paint the synthetic status bar in the capture's own first content
        // colour, so there is no seam whether the screen below is cream or the
        // Settings modal's dimmed backdrop.
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = 1;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, -sampleY);
        const row = ctx.getImageData(0, 0, canvas.width, 1).data;
        const tally = new Map();
        for (let x = 0; x < canvas.width; x += 1) {
          const key = row[x * 4] + ',' + row[x * 4 + 1] + ',' + row[x * 4 + 2];
          tally.set(key, (tally.get(key) || 0) + 1);
        }
        let best = '255,253,225';
        let bestCount = -1;
        for (const [key, count] of tally) {
          if (count > bestCount) {
            best = key;
            bestCount = count;
          }
        }
        const [r, g, b] = best.split(',').map(Number);
        const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        const root = document.documentElement.style;
        root.setProperty('--statusbar-bg', 'rgb(' + best + ')');
        root.setProperty('--statusbar-ink', luminance > 0.5 ? '#1a1918' : '#fffde1');

        // Spanish captions run about a fifth longer than their English
        // counterparts; shrink until the longest one fits its band.
        const caption = document.querySelector('.caption');
        const area = document.querySelector('.caption-area');
        let size = parseFloat(getComputedStyle(caption).fontSize);
        while (
          size > 12 &&
          (caption.scrollHeight > area.clientHeight || caption.scrollWidth > area.clientWidth)
        ) {
          size -= 1;
          caption.style.fontSize = size + 'px';
        }

        await document.fonts.ready;
        const screen = document.querySelector('.screen').getBoundingClientRect();
        const frame = document.querySelector('.device').getBoundingClientRect();
        return {
          captionFontSize: size,
          captionLines: Math.round(caption.scrollHeight / (size * 1.12)),
          screen: { width: screen.width, height: screen.height },
          device: { left: frame.left, top: frame.top, right: frame.right, bottom: frame.bottom },
          natural: { width: img.naturalWidth, height: img.naturalHeight },
        };
      };
    </script>
  </body>
</html>`;
}

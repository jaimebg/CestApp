import path from 'node:path';

/**
 * The app is captured in Spanish only, its primary market. Both store locales
 * frame those same captures, and differ in the caption above them.
 */
export const RAW_LOCALE = 'es';

export const LOCALES = [
  { caption: 'en', store: 'en-US' },
  { caption: 'es', store: 'es-ES' },
];

export const IOS_ROOT = path.join('fastlane', 'screenshots', 'ios');
export const PLAY_METADATA = path.join('fastlane', 'metadata', 'android');

/**
 * Canvas insets as fractions of the tile, per device kind.
 *
 * Tablets get a shallower caption band and tighter margins: their captures are
 * squatter than the 3:4 store canvas, so every point of stage height buys real
 * device size instead of gutter.
 */
const INSETS = {
  phone: { top: 0.215, bottom: 0.045, left: 0.08, right: 0.08 },
  tablet: { top: 0.19, bottom: 0.036, left: 0.07, right: 0.07 },
};

/**
 * Output slots.
 *
 * `deliver` sorts an iOS locale folder into device sets by pixel size, so the
 * phone and iPad sets share `screenshots/ios/<locale>/` and are told apart by
 * their dimensions. The `_ipad` suffix keeps each screen's two tiles adjacent in
 * the filename ordering that drives display order on the listing.
 */
export const SLOTS = [
  {
    id: 'ios-phone',
    device: 'iphone',
    platform: 'ios',
    width: 1290,
    height: 2796,
    insets: INSETS.phone,
    dirFor: (store) => path.join(IOS_ROOT, store),
    fileFor: (screenId) => `${screenId}.png`,
  },
  {
    id: 'ios-tablet',
    device: 'ipad',
    platform: 'ios',
    width: 2048,
    height: 2732,
    insets: INSETS.tablet,
    dirFor: (store) => path.join(IOS_ROOT, store),
    fileFor: (screenId) => `${screenId}_ipad.png`,
  },
  {
    id: 'play-phone',
    device: 'iphone',
    platform: 'android',
    width: 1080,
    height: 2340,
    insets: INSETS.phone,
    dirFor: (store) => path.join(PLAY_METADATA, store, 'images', 'phoneScreenshots'),
    fileFor: (screenId) => `${screenId}.png`,
  },
  {
    id: 'play-tablet',
    device: 'ipad',
    platform: 'android',
    width: 2048,
    height: 2732,
    insets: INSETS.tablet,
    dirFor: (store) => path.join(PLAY_METADATA, store, 'images', 'tenInchScreenshots'),
    fileFor: (screenId) => `${screenId}.png`,
  },
];

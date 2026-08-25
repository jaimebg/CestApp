import path from 'node:path';

export const LOCALES = [
  { raw: 'en', store: 'en-US' },
  { raw: 'es', store: 'es-ES' },
];

export const IOS_ROOT = path.join('fastlane', 'screenshots', 'ios');
export const PLAY_IMAGES = path.join('fastlane', 'metadata', 'android', 'images');

/**
 * Canvas insets as fractions of the tile, per device kind.
 *
 * Tablets get a shallower caption band and tighter margins than phones: their
 * captures are squatter than the 3:4 store canvas, so every point of stage
 * height buys real device size instead of gutter. The iPad slots are
 * permanently landscape (2732x2048), so the only tablet entry is
 * `tabletLandscape`: a landscape device needs a taller caption band relative
 * to its own width to keep two-line captions from crowding the frame.
 */
const INSETS = {
  phone: { top: 0.215, bottom: 0.045, left: 0.08, right: 0.08 },
  tabletLandscape: { top: 0.225, bottom: 0.05, left: 0.05, right: 0.05 },
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
    width: 2732,
    height: 2048,
    insets: INSETS.tabletLandscape,
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
    dirFor: (store) => path.join(PLAY_IMAGES, store, 'phoneScreenshots'),
    fileFor: (screenId) => `${screenId}.png`,
  },
  {
    id: 'play-tablet',
    device: 'ipad',
    platform: 'android',
    width: 2732,
    height: 2048,
    insets: INSETS.tabletLandscape,
    dirFor: (store) => path.join(PLAY_IMAGES, store, 'tenInchScreenshots'),
    fileFor: (screenId) => `${screenId}.png`,
  },
];

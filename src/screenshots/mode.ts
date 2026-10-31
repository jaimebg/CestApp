/**
 * True only in a build bundled with EXPO_PUBLIC_SCREENSHOTS=1, which
 * scripts/store-screenshots/capture.mjs makes for itself. Store builds never
 * set it, so the screenshot route is inert there.
 */
export const SCREENSHOT_MODE = process.env.EXPO_PUBLIC_SCREENSHOTS === '1';

/**
 * Pushed by capture.mjs next to the sample ticket, in the app's own external
 * files folder. A link or a web page cannot create it, so even a screenshot
 * bundle that reached a real phone could never wipe its data.
 */
export const SCREENSHOT_MARKER =
  'file:///sdcard/Android/data/com.jbgsoft.cestapp/files/screenshots.enabled';

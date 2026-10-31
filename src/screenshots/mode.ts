/**
 * True only in a build bundled with EXPO_PUBLIC_SCREENSHOTS=1, which
 * scripts/store-screenshots/capture.mjs makes for itself. Store builds never
 * set it, so the screenshot route is inert there.
 */
export const SCREENSHOT_MODE = process.env.EXPO_PUBLIC_SCREENSHOTS === '1';

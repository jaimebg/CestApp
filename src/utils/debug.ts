/**
 * Debug utilities for development logging
 * Only logs in development mode (__DEV__)
 */

const isDev = __DEV__;

/**
 * Log debug messages only in development mode
 */
export function debugLog(...args: unknown[]): void {
  if (isDev) {
    console.log('[DEBUG]', ...args);
  }
}

/**
 * Log warning messages only in development mode
 */
export function debugWarn(...args: unknown[]): void {
  if (isDev) {
    console.warn('[DEBUG]', ...args);
  }
}

/**
 * Log error messages only in development mode
 */
export function debugError(...args: unknown[]): void {
  if (isDev) {
    console.error('[DEBUG]', ...args);
  }
}

/**
 * Create a scoped logger for a specific module
 */
export function createScopedLogger(scope: string) {
  return {
    log: (...args: unknown[]) => debugLog(`[${scope}]`, ...args),
    warn: (...args: unknown[]) => debugWarn(`[${scope}]`, ...args),
    error: (...args: unknown[]) => debugError(`[${scope}]`, ...args),
  };
}

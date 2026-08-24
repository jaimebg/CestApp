import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ErrorUtils as ErrorUtilsType } from 'react-native';
import { createScopedLogger } from './debug';

const logger = createScopedLogger('ErrorLog');
const STORAGE_KEY = 'cestapp.errorLog';
const MAX_ENTRIES = 50;

export interface ErrorLogEntry {
  timestamp: string;
  scope: string;
  message: string;
  stack?: string;
}

declare const ErrorUtils: ErrorUtilsType;

export function appendError(
  entries: ErrorLogEntry[],
  entry: ErrorLogEntry,
  max = MAX_ENTRIES
): ErrorLogEntry[] {
  return [entry, ...entries].slice(0, max);
}

function toEntry(scope: string, error: unknown): ErrorLogEntry {
  const err = error instanceof Error ? error : new Error(String(error));
  return {
    timestamp: new Date().toISOString(),
    scope,
    message: err.message,
    stack: err.stack,
  };
}

export async function getErrorLog(): Promise<ErrorLogEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ErrorLogEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function logError(scope: string, error: unknown) {
  void (async () => {
    try {
      const entries = await getErrorLog();
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(appendError(entries, toEntry(scope, error)))
      );
    } catch (persistError) {
      logger.warn('Could not persist error log:', persistError);
    }
  })();
}

export async function clearErrorLog() {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

export function installGlobalErrorHandlers() {
  const previousHandler = ErrorUtils.getGlobalHandler();

  ErrorUtils.setGlobalHandler((error, isFatal) => {
    logError(isFatal ? 'fatal' : 'js', error);
    previousHandler(error, isFatal);
  });

  const listener = (event: { reason?: unknown }) => {
    logError('unhandled-rejection', event.reason);
  };
  globalThis.addEventListener?.('unhandledrejection', listener);
}

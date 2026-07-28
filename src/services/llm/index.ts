import { createScopedLogger } from '../../utils/debug';
import { generateStructured, isBackendAvailable } from './appleBackend';
import { buildMessages } from './prompt';
import { RECEIPT_SCHEMA, sanitizeLlmReceipt } from './schema';
import type { ChainHint, LlmReceipt } from './types';

const logger = createScopedLogger('Llm');
const TIMEOUT_MS = 15000;

export type { ChainHint, LlmReceipt } from './types';
export { mergeParsedReceipts, voteTotal } from './merge';
export type { MergeOutcome, MergeResult } from './merge';

export function isLlmAvailable(): boolean {
  return isBackendAvailable();
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      logger.warn('Generation timed out');
      resolve(null);
    }, ms);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        logger.warn('Generation rejected:', error);
        resolve(null);
      });
  });
}

/**
 * Structures raw OCR lines with the on-device model.
 * Never throws: returns null whenever the result cannot be trusted.
 */
export async function structureReceipt(
  lines: string[],
  hint?: ChainHint
): Promise<LlmReceipt | null> {
  if (!isBackendAvailable()) return null;

  const raw = await withTimeout(
    generateStructured(buildMessages(lines, hint), RECEIPT_SCHEMA),
    TIMEOUT_MS
  );

  if (raw === null) return null;

  const sanitized = sanitizeLlmReceipt(raw);
  if (sanitized === null) {
    logger.warn('Model output failed sanitization');
  }
  return sanitized;
}

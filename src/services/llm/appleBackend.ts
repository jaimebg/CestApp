import { Platform } from 'react-native';
import { createScopedLogger } from '../../utils/debug';
import type { AppleMessage } from './types';

const logger = createScopedLogger('LlmBackend');

type AppleGeneratedPart = { type: 'text'; text: string } | { type: string };

type AppleModule = {
  isAvailable(): boolean;
  generateText(messages: AppleMessage[], options: object): Promise<AppleGeneratedPart[]>;
};

let cachedModule: AppleModule | null | undefined;

/**
 * The library resolves its TurboModule with getEnforcing at module top level, which
 * throws wherever the native module is absent — every Android device, and any iOS
 * build without the pod. A static import would therefore crash the review screen on
 * Android instead of degrading to the deterministic parser, so resolution is lazy
 * and guarded.
 */
function getModule(): AppleModule | null {
  if (cachedModule !== undefined) return cachedModule;

  if (Platform.OS !== 'ios') {
    cachedModule = null;
    return cachedModule;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- must be lazy: a static import throws at module-eval time on Android.
    cachedModule = require('@react-native-ai/apple').AppleFoundationModels as AppleModule;
  } catch (error) {
    logger.warn('Native module unavailable:', error);
    cachedModule = null;
  }

  return cachedModule;
}

export function isBackendAvailable(): boolean {
  const appleModule = getModule();
  if (appleModule === null) return false;

  try {
    return appleModule.isAvailable();
  } catch (error) {
    logger.warn('Availability check failed:', error);
    return false;
  }
}

export async function generateStructured(
  messages: AppleMessage[],
  schema: object
): Promise<unknown> {
  const appleModule = getModule();
  if (appleModule === null) return null;

  try {
    const parts = await appleModule.generateText(messages, {
      schema,
      temperature: 0,
    });
    const textPart = parts.find((part) => part.type === 'text');
    if (!textPart || !('text' in textPart)) return null;
    return JSON.parse(textPart.text);
  } catch (error) {
    logger.warn('Generation failed:', error);
    return null;
  }
}

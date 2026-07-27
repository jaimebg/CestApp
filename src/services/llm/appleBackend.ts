import { AppleFoundationModels } from '@react-native-ai/apple';
import { createScopedLogger } from '../../utils/debug';
import type { AppleMessage } from './types';

const logger = createScopedLogger('LlmBackend');

export function isBackendAvailable(): boolean {
  try {
    return AppleFoundationModels.isAvailable();
  } catch (error) {
    logger.warn('Availability check failed:', error);
    return false;
  }
}

export async function generateStructured(
  messages: AppleMessage[],
  schema: object
): Promise<unknown> {
  try {
    const parts = await AppleFoundationModels.generateText(messages, {
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

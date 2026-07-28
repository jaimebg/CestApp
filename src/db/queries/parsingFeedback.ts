import { db } from '../client';
import { parsingFeedback } from '../schema';

export async function recordLlmFeedback(params: {
  accepted: boolean;
  ocrContext: string;
  originalValue: string;
  correctedValue: string;
  originalConfidence: number;
}): Promise<void> {
  await db.insert(parsingFeedback).values({
    fieldType: params.accepted ? 'llm_accepted' : 'llm_rejected',
    ocrContext: params.ocrContext,
    originalValue: params.originalValue,
    correctedValue: params.correctedValue,
    originalConfidence: params.originalConfidence,
  });
}

/**
 * Records a receipt the arithmetic reconciliation rule applied automatically,
 * without asking the user. No consumer other than this call observes these
 * cases today, so this is the only way they end up in the evaluation corpus.
 */
export async function recordLlmAutoApplied(params: {
  ocrContext: string;
  originalValue: string;
  correctedValue: string;
  originalConfidence: number;
}): Promise<void> {
  await db.insert(parsingFeedback).values({
    fieldType: 'llm_auto_applied',
    ocrContext: params.ocrContext,
    originalValue: params.originalValue,
    correctedValue: params.correctedValue,
    originalConfidence: params.originalConfidence,
  });
}

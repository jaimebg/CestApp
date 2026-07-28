import { validateReceipt, type ParsedReceipt } from '../ocr/parser';
import type { MergeOutcome } from './merge';

const MIN_CONFIDENCE = 70;

export type RefinementDecision = 'apply' | 'propose' | 'discard';

/**
 * Deliberately generous: a false positive only costs battery, whereas the
 * strictness that protects the data lives in mergeParsedReceipts.
 */
export function shouldRefine(receipt: ParsedReceipt): boolean {
  if (receipt.items.length === 0) return true;
  if (receipt.confidence < MIN_CONFIDENCE) return true;
  return !validateReceipt(receipt).itemsSumMatchesTotal;
}

/**
 * The user's own edits always win: once they have touched the receipt,
 * nothing is applied without their confirmation.
 */
export function decideOutcome(outcome: MergeOutcome, hasUserEdited: boolean): RefinementDecision {
  if (outcome === 'none') return 'discard';
  if (outcome === 'auto' && !hasUserEdited) return 'apply';
  return 'propose';
}

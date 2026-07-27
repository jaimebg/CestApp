import type { ParsedReceipt } from '../ocr/parser';
import { filterHallucinatedItems } from './guards';
import { reconciles } from './reconcile';
import type { LlmReceipt } from './types';

const VOTE_EPSILON = 0.01;

export type MergeOutcome = 'auto' | 'proposal' | 'none';

export interface MergeResult {
  merged: ParsedReceipt;
  outcome: MergeOutcome;
}

function agree(a: number | null, b: number | null): boolean {
  return a !== null && b !== null && Math.abs(a - b) <= VOTE_EPSILON;
}

/**
 * Resolves the total across the three independent readings.
 * With fewer than three sources there is no majority, so the parser wins
 * unless it has nothing to offer.
 */
export function voteTotal(
  parserTotal: number | null,
  detectedTotal: number | null,
  llmTotal: number | null
): number | null {
  if (parserTotal === null) return detectedTotal ?? llmTotal;

  if (detectedTotal !== null && llmTotal !== null) {
    if (agree(detectedTotal, llmTotal) && !agree(parserTotal, detectedTotal)) {
      return detectedTotal;
    }
  }

  return parserTotal;
}

export function mergeParsedReceipts(
  deterministic: ParsedReceipt,
  llm: LlmReceipt,
  lines: string[],
  detectedTotal: number | null
): MergeResult {
  const items = filterHallucinatedItems(llm.items, lines);

  if (items.length === 0) {
    return { merged: deterministic, outcome: 'none' };
  }

  const total = voteTotal(deterministic.total, detectedTotal, llm.total);

  const merged: ParsedReceipt = {
    ...deterministic,
    storeName: deterministic.storeName ?? llm.storeName,
    dateString: deterministic.dateString ?? llm.date,
    time: deterministic.time ?? llm.time,
    items,
    total,
  };

  const outcome: MergeOutcome = reconciles(items, merged.discount, total) ? 'auto' : 'proposal';

  return { merged, outcome };
}

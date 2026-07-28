import { validateReceipt, type ParsedReceipt } from '../ocr/parser';
import { filterHallucinatedItems, findSourceLine } from './guards';
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
 * The schema constrains the model to DD/MM/YYYY, so anything else is discarded
 * rather than guessed at. Both date fields move together: filling dateString alone
 * would leave the screen, which reads date, with nothing.
 */
function parseLlmDate(value: string | null): Date | null {
  if (value === null) return null;

  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match === null) return null;

  const [, day, month, year] = match;
  const parsed = new Date(Number(year), Number(month) - 1, Number(day));

  const rolledOver =
    parsed.getDate() !== Number(day) ||
    parsed.getMonth() !== Number(month) - 1 ||
    parsed.getFullYear() !== Number(year);

  return rolledOver ? null : parsed;
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

/**
 * Merges the LLM reading with the deterministic parse and decides whether the
 * result is trustworthy enough to auto-apply.
 *
 * `reconciles` is only meaningful evidence when it is a real constraint. With two
 * or more items anchored to distinct lines, summing exactly to the total means
 * every other item would have to net to zero to smuggle in a fabricated one — a
 * strong signal. With exactly one item, "the items sum to the total" collapses to
 * one number compared against itself and reconciles by construction, so a
 * single-item LLM result only auto-applies when the deterministic parser
 * independently found exactly one item priced the same — agreement on identity,
 * not merely on count. Matching counts alone would let a fabricated single item
 * (e.g. a summary line misread as a product, priced at the total) silently
 * replace the real single item the deterministic parser found, since both sides
 * would report "exactly one item" without describing the same item.
 *
 * The same premise applies to the total itself: reconciliation is evidence only
 * while the total is fixed by something other than the model. When both the
 * deterministic parser and the receipt-total detector have nothing, `voteTotal`
 * fills the gap from the LLM's own reading, and `reconciles` would then be
 * comparing the LLM's items against the LLM's own total — which proves only
 * internal consistency, not correctness, since the model can supply both sides of
 * the equation. Auto-apply therefore additionally requires the total to be
 * anchored: found verbatim in the OCR text, exactly as item prices already are.
 * That anchoring is automatic when the parser or the detector supplied the total,
 * since both read it off the receipt; it is the only thing standing between "the
 * model was right" and "the model was merely consistent with itself" when the LLM
 * supplied it.
 */
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

  const llmDate = deterministic.date === null ? parseLlmDate(llm.date) : null;

  const mergedFields: ParsedReceipt = {
    ...deterministic,
    storeName: deterministic.storeName ?? llm.storeName,
    date: deterministic.date ?? llmDate,
    dateString: llmDate !== null ? llm.date : deterministic.dateString,
    time: deterministic.time ?? llm.time,
    items,
    total,
  };

  const merged: ParsedReceipt = {
    ...mergedFields,
    confidence: validateReceipt(mergedFields).confidence,
  };

  const losesItems = items.length < deterministic.items.length;

  const singleItemConfirmed =
    items.length === 1 &&
    deterministic.items.length === 1 &&
    Math.abs(items[0].totalPrice - deterministic.items[0].totalPrice) <= VOTE_EPSILON;

  const unconfirmedSingleItem = items.length === 1 && !singleItemConfirmed;

  const totalIsAnchored = total !== null && findSourceLine(total, lines) !== null;

  const outcome: MergeOutcome =
    reconciles(items, merged.discount, total) &&
    !losesItems &&
    !unconfirmedSingleItem &&
    totalIsAnchored
      ? 'auto'
      : 'proposal';

  return { merged, outcome };
}

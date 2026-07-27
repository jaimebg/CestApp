import type { ParsedItem } from '../ocr/parser';

const ABSOLUTE_TOLERANCE = 0.02;
const RELATIVE_TOLERANCE = 0.005;

/**
 * Checks whether the item prices add up to the printed total, discounts included.
 * Deliberately stricter than validateReceipt: only an exact match authorises
 * applying an LLM result without user confirmation.
 */
export function reconciles(
  items: ParsedItem[],
  discount: number | null,
  total: number | null
): boolean {
  if (total === null || items.length === 0) return false;

  const sum = items.reduce((acc, current) => acc + current.totalPrice, 0);
  const expected = sum - (discount ?? 0);
  const tolerance = Math.max(ABSOLUTE_TOLERANCE, Math.abs(total) * RELATIVE_TOLERANCE);

  return Math.abs(expected - total) <= tolerance;
}

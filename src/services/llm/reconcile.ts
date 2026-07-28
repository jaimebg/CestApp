import type { ParsedItem } from '../ocr/parser';

const TOLERANCE = 0.02;

/**
 * Checks whether the item prices add up to the printed total, discounts included.
 * Deliberately stricter than validateReceipt: only a near-exact match authorises
 * applying an LLM result without user confirmation.
 *
 * The tolerance is a flat 2 cents, not a fraction of the total. Printed line
 * totals — including for weighted goods, where the receipt prints the already
 * computed line total rather than a unit price — are exact to the cent, so a
 * genuine receipt's items always sum to the total within rounding noise
 * regardless of how large the total is. A tolerance that scaled with the total
 * would reopen exactly the hole this function exists to close: on an 81.05 euro
 * receipt a relative floor can absorb a missing 15-cent item (a plastic bag, a
 * loose-produce line) and still call it reconciled.
 */
export function reconciles(
  items: ParsedItem[],
  discount: number | null,
  total: number | null
): boolean {
  if (total === null || items.length === 0) return false;

  const sum = items.reduce((acc, current) => acc + current.totalPrice, 0);
  const expected = sum - (discount ?? 0);

  return Math.abs(expected - total) <= TOLERANCE;
}

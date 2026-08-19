/** A word that only appears once the receipt has stopped listing products. */
const TOTAL_WORD = /\b(SUBTOTAL|TOTAL)\b/i;

const AMOUNT = /-?\d+[.,]\d{2}/;

/**
 * Index of the first line that is no longer part of the item list.
 *
 * Everything a receipt prints after its total is shaped like an item and is
 * not one: the IVA table reads "10% 30,04 3,00", the loyalty block reads
 * "DESCUENTOS: 0,68", the payment block reads "VENTA 10,59". Parsed as
 * products they inflate the basket by the tax the customer already paid --
 * a Mercadona receipt totalling 37,02 came out as 40,21.
 *
 * The first line that names a total and carries an amount ends the list. On a
 * receipt that settles basket coupons after a subtotal, that is the subtotal
 * line, which is exactly where the item list stops.
 */
export function endOfItemLines(lines: string[]): number {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!TOTAL_WORD.test(line) || !AMOUNT.test(line)) continue;

    // A total in the first couple of lines is a header, not the end of a list
    // that has not started yet.
    if (i < 2) continue;

    return i;
  }

  return lines.length;
}

/** The lines of a receipt that can hold items, with the totals block dropped. */
export function itemLines(lines: string[]): string[] {
  return lines.slice(0, endOfItemLines(lines));
}

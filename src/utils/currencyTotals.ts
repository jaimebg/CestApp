/**
 * Spending kept apart per currency: amounts in different currencies are never
 * added together, so a screen leads with one and lists the others beside it.
 */

export interface CurrencyTotal {
  currency: string;
  total: number;
}

/** The home currency when it has spending, else the currency spent most in. */
export function pickPrimaryCurrency(totals: CurrencyTotal[], home: string): string {
  if (totals.some((t) => t.currency === home)) return home;
  const [largest] = [...totals].sort((a, b) => b.total - a.total);
  return largest?.currency ?? home;
}

/** Every currency but the primary one, largest first. */
export function otherCurrencyTotals(totals: CurrencyTotal[], primary: string): CurrencyTotal[] {
  return totals.filter((t) => t.currency !== primary).sort((a, b) => b.total - a.total);
}

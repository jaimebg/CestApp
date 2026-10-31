export type HistoryEntry<T> =
  { type: 'header'; key: string; date: Date | null } | { type: 'row'; key: string; item: T };

const pad = (value: number) => String(value).padStart(2, '0');

/**
 * Interleaves a month header before the first item of each month, keeping the
 * input order. Undated items are gathered under a single header at the end.
 */
export function groupByMonth<T>(
  items: T[],
  dateOf: (item: T) => Date | null,
  keyOf: (item: T) => string
): HistoryEntry<T>[] {
  const entries: HistoryEntry<T>[] = [];
  const undated: T[] = [];
  let currentMonth: string | null = null;

  for (const item of items) {
    const date = dateOf(item);
    if (!date) {
      undated.push(item);
      continue;
    }
    const month = `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
    if (month !== currentMonth) {
      currentMonth = month;
      entries.push({
        type: 'header',
        key: `month-${month}`,
        date: new Date(date.getFullYear(), date.getMonth(), 1),
      });
    }
    entries.push({ type: 'row', key: keyOf(item), item });
  }

  if (undated.length > 0) {
    entries.push({ type: 'header', key: 'month-none', date: null });
    for (const item of undated) entries.push({ type: 'row', key: keyOf(item), item });
  }

  return entries;
}

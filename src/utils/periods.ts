export type DateRange = { start: Date; end: Date };

export type ComparablePeriod = 'week' | 'month' | 'year';

export type Change = { direction: 'more' | 'less' | 'same'; delta: number };

function startOfDay(year: number, month: number, day: number): Date {
  return new Date(year, month, day, 0, 0, 0, 0);
}

function endOfDay(year: number, month: number, day: number): Date {
  return new Date(year, month, day, 23, 59, 59, 999);
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * The period so far, and the stretch of the previous period that matches it.
 *
 * A month on its 5th compares with the 1st–5th of the month before, not with
 * that whole month, which would read as "less" every early day of the month.
 */
export function getComparableRange(
  period: ComparablePeriod,
  now: Date = new Date()
): { current: DateRange; previous: DateRange } {
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();

  switch (period) {
    case 'week':
      return {
        current: { start: startOfDay(y, m, d - 6), end: endOfDay(y, m, d) },
        previous: { start: startOfDay(y, m, d - 13), end: endOfDay(y, m, d - 7) },
      };
    case 'month': {
      const prevDay = Math.min(d, lastDayOfMonth(y, m - 1));
      return {
        current: { start: startOfDay(y, m, 1), end: endOfDay(y, m, d) },
        previous: { start: startOfDay(y, m - 1, 1), end: endOfDay(y, m - 1, prevDay) },
      };
    }
    case 'year': {
      const prevDay = Math.min(d, lastDayOfMonth(y - 1, m));
      return {
        current: { start: startOfDay(y, 0, 1), end: endOfDay(y, m, d) },
        previous: { start: startOfDay(y - 1, 0, 1), end: endOfDay(y - 1, m, prevDay) },
      };
    }
  }
}

/** How the current amount compares with the previous one, or null when there is nothing to compare with. */
export function describeChange(current: number, previous: number): Change | null {
  if (previous <= 0) return null;
  const delta = Math.round(Math.abs(current - previous) * 100) / 100;
  if (delta === 0) return { direction: 'same', delta: 0 };
  return { direction: current > previous ? 'more' : 'less', delta };
}

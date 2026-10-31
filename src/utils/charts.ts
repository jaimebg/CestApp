import { formatPrice, type Currency } from '@/src/config/currency';
import type { ComparablePeriod } from './periods';

export type Bucket = { key: string; amount: number; isCurrent: boolean };

const STEP_MANTISSAS = [1, 2, 2.5, 5];
const MAX_SECTIONS = 5;

/** An axis top and step on round numbers, with at most five sections. */
export function niceScale(max: number): { top: number; step: number; sections: number } {
  if (max <= 0) return { top: 10, step: 5, sections: 2 };

  let magnitude = 10 ** Math.floor(Math.log10(max / MAX_SECTIONS));
  for (;;) {
    for (const mantissa of STEP_MANTISSAS) {
      const step = mantissa * magnitude;
      const sections = Math.ceil(max / step - 1e-9);
      if (sections <= MAX_SECTIONS) {
        return { top: roundTo(sections * step), step: roundTo(step), sections };
      }
    }
    magnitude *= 10;
  }
}

function roundTo(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

const pad = (value: number) => String(value).padStart(2, '0');
const dayKey = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const monthKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;

/**
 * Every day (or month, for a year) of the period up to today, with zero where
 * nothing was bought, so the current bar always exists and gaps read as gaps.
 * Keys are local dates, matching the `localtime` buckets of `getSpendingByDay`.
 */
export function fillBuckets(
  period: ComparablePeriod,
  rows: { date: string; amount: number }[],
  now: Date = new Date()
): Bucket[] {
  const amounts = new Map(rows.map((row) => [row.date, row.amount]));
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();

  const dates: Date[] =
    period === 'year'
      ? Array.from({ length: m + 1 }, (_, month) => new Date(y, month, 1))
      : period === 'month'
        ? Array.from({ length: d }, (_, index) => new Date(y, m, index + 1))
        : Array.from({ length: 7 }, (_, index) => new Date(y, m, d - 6 + index));

  const keyOf = period === 'year' ? monthKey : dayKey;
  return dates.map((date, index) => {
    const key = keyOf(date);
    return { key, amount: amounts.get(key) ?? 0, isCurrent: index === dates.length - 1 };
  });
}

/** `50 €` for a whole tick, `12,50 €` otherwise. */
export function formatAxisAmount(value: number, currency: Currency): string {
  const decimals = Number.isInteger(value) ? 0 : currency.decimals;
  return formatPrice(value, { ...currency, decimals });
}

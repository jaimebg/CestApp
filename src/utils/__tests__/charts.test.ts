import { axisLabels, fillBuckets, formatAxisAmount, niceScale } from '../charts';
import { DEFAULT_CURRENCY, getCurrency, getNumberLocale } from '@/src/config/currency';

const es = getNumberLocale('es');

describe('niceScale', () => {
  it.each([
    [49, { top: 50, step: 10, sections: 5 }],
    [124, { top: 125, step: 25, sections: 5 }],
    [3.2, { top: 4, step: 1, sections: 4 }],
    [1200, { top: 1250, step: 250, sections: 5 }],
    [0, { top: 10, step: 5, sections: 2 }],
  ])('scales %p to round ticks', (max, expected) => {
    expect(niceScale(max)).toEqual(expected);
  });
});

describe('fillBuckets', () => {
  it('gives every day of the month so far a bar, today marked current', () => {
    const buckets = fillBuckets(
      'month',
      [{ date: '2026-10-03', amount: 12 }],
      new Date(2026, 9, 5, 18)
    );
    expect(buckets.map((b) => b.key)).toEqual([
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
      '2026-10-04',
      '2026-10-05',
    ]);
    expect(buckets.map((b) => b.amount)).toEqual([0, 0, 12, 0, 0]);
    expect(buckets.map((b) => b.isCurrent)).toEqual([false, false, false, false, true]);
  });

  it('fills an empty week ending today with zero bars', () => {
    const buckets = fillBuckets('week', [], new Date(2026, 0, 1, 0, 30));
    expect(buckets).toHaveLength(7);
    expect(buckets[0]).toEqual({ key: '2025-12-26', amount: 0, isCurrent: false });
    expect(buckets[6]).toEqual({ key: '2026-01-01', amount: 0, isCurrent: true });
  });

  it('gives every month of the year so far a bar', () => {
    const buckets = fillBuckets('year', [{ date: '2026-02', amount: 30 }], new Date(2026, 3, 10));
    expect(buckets).toEqual([
      { key: '2026-01', amount: 0, isCurrent: false },
      { key: '2026-02', amount: 30, isCurrent: false },
      { key: '2026-03', amount: 0, isCurrent: false },
      { key: '2026-04', amount: 0, isCurrent: true },
    ]);
  });
});

describe('formatAxisAmount', () => {
  const eur = getCurrency(DEFAULT_CURRENCY);

  it('drops the decimals of a whole amount', () => {
    expect(formatAxisAmount(50, eur, es)).toBe('50 €');
  });

  it('keeps the decimals of a fractional amount', () => {
    expect(formatAxisAmount(12.5, eur, es)).toBe('12,50 €');
  });
});

describe('axisLabels', () => {
  const eur = getCurrency(DEFAULT_CURRENCY);

  it('labels fractional steps without truncating them', () => {
    expect(axisLabels(niceScale(11.4), eur, es)).toEqual([
      '0 €',
      '2,50 €',
      '5 €',
      '7,50 €',
      '10 €',
      '12,50 €',
    ]);
  });
});

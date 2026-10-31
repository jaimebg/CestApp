import { otherCurrencyTotals, pickPrimaryCurrency } from '../currencyTotals';

test('home currency leads when present', () => {
  expect(
    pickPrimaryCurrency(
      [
        { currency: 'GBP', total: 90 },
        { currency: 'EUR', total: 10 },
      ],
      'EUR'
    )
  ).toBe('EUR');
});

test('picks the largest currency when home is absent', () => {
  expect(
    pickPrimaryCurrency(
      [
        { currency: 'GBP', total: 40 },
        { currency: 'CHF', total: 70 },
      ],
      'EUR'
    )
  ).toBe('CHF');
});

test('no spending keeps home', () => {
  expect(pickPrimaryCurrency([], 'EUR')).toBe('EUR');
});

test('others exclude the primary, largest first', () => {
  expect(
    otherCurrencyTotals(
      [
        { currency: 'EUR', total: 5 },
        { currency: 'GBP', total: 1 },
        { currency: 'CHF', total: 3 },
      ],
      'EUR'
    ).map((t) => t.currency)
  ).toEqual(['CHF', 'GBP']);
});

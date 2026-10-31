import { createManualParsedReceipt } from '../../ocr/parser';
import {
  basketWithinTolerance,
  fixtureFromRecord,
  parsePrintedAmount,
  readFixture,
} from '../fixture';
import { SCRUB_VERSION } from '../scrub';
import { mercadonaRecord } from './benchFixtures';

const meta = {
  country: 'ES' as const,
  chainId: 'mercadona',
  donation: 'https://github.com/jaimebg/CestApp/issues/1',
  printed: { subtotal: null, total: 28.58 },
};

function withItems(prices: number[]) {
  return {
    ...createManualParsedReceipt(new Date(2026, 9, 15)),
    items: prices.map((totalPrice) => ({
      name: 'X',
      quantity: 1,
      unitPrice: totalPrice,
      totalPrice,
      unit: null,
      confidence: 80,
    })),
  };
}

test('a fixture made from a record is stamped and scrubbed', () => {
  const record = mercadonaRecord('m1');
  record.raw.blocks[0].lines[0].text = 'VISA 4111 1111 1111 1111';
  const fixture = fixtureFromRecord(record, meta);
  expect(fixture.scrubbedBy).toBe(SCRUB_VERSION);
  expect(fixture.knownDimensions).toEqual(record.knownDimensions);
  expect(fixture.raw.blocks[0].lines[0].text).toBe('VISA **** **** **** ****');
});

test('a fixture is read back through the app’s pipeline', () => {
  const parsed = readFixture(fixtureFromRecord(mercadonaRecord('m1'), meta));
  expect(parsed).toMatchObject({ chainId: 'mercadona', countryCode: 'ES' });
});

test('the basket may miss the printed total by up to 2%', () => {
  expect(basketWithinTolerance(withItems([5, 5]), { subtotal: null, total: 10.15 })).toBe(true);
  expect(basketWithinTolerance(withItems([5, 5]), { subtotal: null, total: 11 })).toBe(false);
});

test('the basket is held to the subtotal when one is printed', () => {
  expect(basketWithinTolerance(withItems([5, 5]), { subtotal: 10, total: 9 })).toBe(true);
});

test('reads a printed amount written with either decimal separator', () => {
  expect(parsePrintedAmount('23,45')).toBe(23.45);
  expect(parsePrintedAmount('23.45')).toBe(23.45);
});

test('refuses a printed amount that is not a number', () => {
  expect(() => parsePrintedAmount('abc')).toThrow('not an amount');
  expect(() => parsePrintedAmount('')).toThrow('not an amount');
});

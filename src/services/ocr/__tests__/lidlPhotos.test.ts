import { LIDL_PHOTO_FIXTURES, type PhotoFixture } from './fixtures.lidlPhotos';
import { autoDetectZones } from '../autoZoneDetector';
import { parseReceipt } from '../parser';
import { reconstructRows } from '../rowReconstructor';

interface Expectation {
  fixture: PhotoFixture;
  /** The total printed on the receipt. */
  total: number;
  /** How many line items the receipt lists. */
  itemCount: number;
}

const RECEIPTS: [string, Expectation][] = [
  [
    '20-05-2024',
    { fixture: LIDL_PHOTO_FIXTURES.lidlLosLlanos20240520, total: 45.48, itemCount: 16 },
  ],
  [
    '26-12-2023',
    { fixture: LIDL_PHOTO_FIXTURES.lidlLosLlanos20231226, total: 68.62, itemCount: 27 },
  ],
  [
    '24-12-2023',
    { fixture: LIDL_PHOTO_FIXTURES.lidlLosLlanos20231224, total: 35.7, itemCount: 18 },
  ],
  ['20-08-2024', { fixture: LIDL_PHOTO_FIXTURES.lidlLosLlanosExtra, total: 67.05, itemCount: 25 }],
];

/**
 * How far the recognized basket may sit from the printed total.
 *
 * These fixtures carry real recognition errors, and some of them fall on a
 * digit: "0,50" read as "8, 50", a "-0,28" discount read as "-8.28". The parser
 * cannot recover a digit the recognizer never saw, so the assertion is that the
 * basket stays close to the receipt -- close enough that the failures this
 * suite exists to catch, whole tax tables parsed as products, cannot hide
 * inside it.
 */
const BASKET_TOLERANCE = 0.02;

const TOTALS_BLOCK = /^(total|entregado|cambio|tarjeta|igic|iva)\b/i;

describe.each(RECEIPTS)('lidl photo %s', (_label, { fixture, total, itemCount }) => {
  const rows = reconstructRows(fixture.blocks);
  const parsed = parseReceipt(rows);

  it('rejoins the name and price columns into printed rows', () => {
    // Recognizers emit Lidl's two columns as separate observations; unjoined,
    // no row carries both a product and its price.
    const priced = rows.filter((row) => /\p{L}/u.test(row) && /\d+[,.]\d{2}\s*$/.test(row));
    expect(priced.length).toBeGreaterThanOrEqual(itemCount - 2);
  });

  it('identifies Lidl', () => {
    expect(parsed.chainId).toBe('lidl');
  });

  it('reads the printed total', () => {
    expect(parsed.total).toBeCloseTo(total, 2);
  });

  it('lists close to every line item', () => {
    expect(parsed.items.length).toBeGreaterThanOrEqual(itemCount - 1);
    expect(parsed.items.length).toBeLessThanOrEqual(itemCount);
  });

  it('keeps the basket within a recognition error of the printed total', () => {
    const sum = parsed.items.reduce((acc, item) => acc + item.totalPrice, 0);
    expect(Math.abs(sum - total)).toBeLessThanOrEqual(total * BASKET_TOLERANCE);
  });

  it('never turns a totals-block line into a product', () => {
    for (const item of parsed.items) {
      expect(item.name).not.toMatch(TOTALS_BLOCK);
    }
  });

  it('detects the zones the review screen draws over the receipt', () => {
    const detected = autoDetectZones(fixture.blocks, fixture.dimensions);
    const types = detected.zones.map((zone) => zone.type);

    expect(types).toContain('product_names');
    expect(types).toContain('prices');
    expect(types).toContain('total');
  });

  it('stops the product zone above the totals block', () => {
    const detected = autoDetectZones(fixture.blocks, fixture.dimensions);
    const products = detected.zones.find((zone) => zone.type === 'product_names');
    const totalZone = detected.zones.find((zone) => zone.type === 'total');

    expect(products).toBeDefined();
    expect(totalZone).toBeDefined();
    expect(products!.boundingBox.y + products!.boundingBox.height).toBeLessThanOrEqual(
      totalZone!.boundingBox.y + totalZone!.boundingBox.height
    );
  });
});

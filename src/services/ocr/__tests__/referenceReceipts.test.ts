import { RECEIPT_FIXTURES } from './receiptFixtures';
import { parseReceipt } from '../parser';

function sumOf(prices: number[]): number {
  return Math.round(prices.reduce((sum, price) => sum + price, 0) * 100) / 100;
}

describe.each(RECEIPT_FIXTURES)('$id', (fixture) => {
  const parsed = parseReceipt(fixture.lines);

  it('identifies the chain', () => {
    expect(parsed.chainId).toBe(fixture.chainId);
  });

  it('reads the printed total', () => {
    expect(parsed.total).toBeCloseTo(fixture.total, 2);
  });

  it('lists every line item the receipt prints', () => {
    expect(parsed.items.map((item) => item.name)).toHaveLength(fixture.itemCount);
  });

  it('adds its items up to the printed figure', () => {
    expect(sumOf(parsed.items.map((item) => item.totalPrice))).toBeCloseTo(fixture.itemsTotal, 2);
  });

  it('gives every item a name that is not a total, a tax rate or a payment line', () => {
    for (const item of parsed.items) {
      expect(item.name).not.toMatch(/^\d+[,.]\d{2}\s*%/);
      expect(item.name).not.toMatch(/\b(TOTAL|SUBTOTAL|DESCUENTOS?|IVA|IGIC|CUOTA|VENTA)\b/i);
      expect(item.name).not.toMatch(/^\d+[,.]\d{2}$/);
    }
  });

  it('prices every item above zero', () => {
    for (const item of parsed.items) {
      expect(item.totalPrice).toBeGreaterThan(0);
    }
  });
});

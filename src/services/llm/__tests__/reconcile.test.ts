import { reconciles } from '../reconcile';
import type { ParsedItem } from '../../ocr/parser';

function item(totalPrice: number): ParsedItem {
  return { name: 'X', quantity: 1, unitPrice: totalPrice, totalPrice, unit: null, confidence: 80 };
}

describe('reconciles', () => {
  it('accepts an exact match', () => {
    expect(reconciles([item(1.1), item(0.85)], null, 1.95)).toBe(true);
  });

  it('subtracts the discount before comparing', () => {
    expect(reconciles([item(10), item(5)], 3, 12)).toBe(true);
  });

  it('rejects a mismatch that the 5% legacy tolerance would have accepted', () => {
    expect(reconciles([item(77)], null, 80)).toBe(false);
  });

  it('accepts rounding noise within 2 cents', () => {
    expect(reconciles([item(1.005), item(0.99)], null, 2.0)).toBe(true);
  });

  it('accepts a difference just inside the 2-cent absolute tolerance', () => {
    expect(reconciles([item(1.9801)], null, 2.0)).toBe(true);
  });

  it('rejects a difference just outside the 2-cent absolute tolerance', () => {
    expect(reconciles([item(1.9799)], null, 2.0)).toBe(false);
  });

  it('rejects a difference on a large total that the removed 0.5% relative floor used to absorb', () => {
    expect(reconciles([item(1000)], null, 1004)).toBe(false);
  });

  it('holds the 2-cent tolerance flat regardless of total size', () => {
    expect(reconciles([item(1000)], null, 1000.02)).toBe(true);
    expect(reconciles([item(1000)], null, 1000.03)).toBe(false);
  });

  it('rejects a receipt missing a small item that the removed relative floor would have masked', () => {
    expect(reconciles([item(80.9)], null, 81.05)).toBe(false);
  });

  it('rejects when the total is null', () => {
    expect(reconciles([item(1.1)], null, null)).toBe(false);
  });

  it('rejects when there are no items', () => {
    expect(reconciles([], null, 5)).toBe(false);
  });

  it('rejects an empty item list even when the total is zero', () => {
    expect(reconciles([], null, 0)).toBe(false);
  });
});

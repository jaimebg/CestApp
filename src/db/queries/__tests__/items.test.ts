import { toNewItems } from '../items';
import type { ParsedItem } from '@/src/services/ocr/parser';

jest.mock('@/src/db/client', () => ({ db: { transaction: jest.fn() } }));

const categorized: (ParsedItem & { categoryId: number; confidence: number })[] = [
  {
    name: 'JAMÓN SERRANO',
    quantity: 0.762,
    unitPrice: 24.5,
    totalPrice: 18.67,
    unit: 'kg',
    confidence: 100,
    categoryId: 3,
  },
  {
    name: 'Agua 1L',
    quantity: 2,
    unitPrice: 0.5,
    totalPrice: 1,
    unit: null,
    confidence: 90,
    categoryId: 5,
  },
];

describe('toNewItems', () => {
  it('maps parsed items to insert rows with cents and normalized name', () => {
    const rows = toNewItems(42, categorized);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      receiptId: 42,
      name: 'JAMÓN SERRANO',
      normalizedName: 'jamon serrano',
      price: 1867,
      quantity: 0.762,
      unitPrice: 2450,
      unit: 'kg',
      categoryId: 3,
      confidence: 100,
    });
    expect(rows[1]).toMatchObject({ price: 100, quantity: 2 });
  });

  it('returns an empty array for an empty list', () => {
    expect(toNewItems(1, [])).toEqual([]);
  });
});

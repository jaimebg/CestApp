import { sanitizeLlmReceipt, RECEIPT_SCHEMA } from '../schema';

describe('RECEIPT_SCHEMA', () => {
  it('declares items as an array of objects', () => {
    const items = (RECEIPT_SCHEMA as any).properties.items;
    expect(items.type).toBe('array');
    expect(items.items.type).toBe('object');
  });

  it('restricts unit to the metric units the app supports', () => {
    const unit = (RECEIPT_SCHEMA as any).properties.items.items.properties.unit;
    expect(unit.enum).toEqual(['each', 'kg', 'g', 'l', 'ml']);
  });
});

describe('sanitizeLlmReceipt', () => {
  it('returns null for non-objects', () => {
    expect(sanitizeLlmReceipt(null)).toBeNull();
    expect(sanitizeLlmReceipt('nope')).toBeNull();
    expect(sanitizeLlmReceipt(42)).toBeNull();
  });

  it('returns null when items is missing or not an array', () => {
    expect(sanitizeLlmReceipt({})).toBeNull();
    expect(sanitizeLlmReceipt({ items: 'x' })).toBeNull();
  });

  it('maps a well-formed payload', () => {
    const result = sanitizeLlmReceipt({
      storeName: 'Mercadona',
      date: '10/03/2026',
      time: '18:45',
      total: 3.38,
      items: [{ name: 'Leche', quantity: 1, unitPrice: 0.98, totalPrice: 0.98, unit: 'each' }],
    });
    expect(result).toEqual({
      storeName: 'Mercadona',
      date: '10/03/2026',
      time: '18:45',
      total: 3.38,
      items: [
        {
          name: 'Leche',
          quantity: 1,
          unitPrice: 0.98,
          totalPrice: 0.98,
          unit: 'each',
          confidence: 70,
        },
      ],
    });
  });

  it('drops items without a usable name or price', () => {
    const result = sanitizeLlmReceipt({
      items: [
        { name: '', totalPrice: 1 },
        { name: 'Pan', totalPrice: 'mucho' },
        { name: 'Leche', totalPrice: 0.98 },
      ],
    });
    expect(result?.items).toHaveLength(1);
    expect(result?.items[0].name).toBe('Leche');
  });

  it('defaults missing optional item fields', () => {
    const result = sanitizeLlmReceipt({ items: [{ name: 'Leche', totalPrice: 0.98 }] });
    expect(result?.items[0]).toEqual({
      name: 'Leche',
      quantity: 1,
      unitPrice: 0.98,
      totalPrice: 0.98,
      unit: null,
      confidence: 70,
    });
  });

  it('rejects an out-of-union unit', () => {
    const result = sanitizeLlmReceipt({
      items: [{ name: 'Leche', totalPrice: 0.98, unit: 'litros' }],
    });
    expect(result?.items[0].unit).toBeNull();
  });

  it('nulls absent header fields', () => {
    const result = sanitizeLlmReceipt({ items: [{ name: 'Leche', totalPrice: 0.98 }] });
    expect(result?.storeName).toBeNull();
    expect(result?.date).toBeNull();
    expect(result?.time).toBeNull();
    expect(result?.total).toBeNull();
  });

  it('derives a missing unitPrice from totalPrice divided by quantity', () => {
    const result = sanitizeLlmReceipt({
      items: [{ name: 'Tomates', quantity: 3, totalPrice: 9 }],
    });
    expect(result?.items[0].unitPrice).toBe(3);
  });

  it('falls back quantity to 1 when it is zero', () => {
    const result = sanitizeLlmReceipt({
      items: [{ name: 'Leche', quantity: 0, totalPrice: 0.98 }],
    });
    expect(result?.items).toHaveLength(1);
    expect(result?.items[0].quantity).toBe(1);
  });

  it('falls back quantity to 1 when it is negative', () => {
    const result = sanitizeLlmReceipt({
      items: [{ name: 'Leche', quantity: -2, totalPrice: 0.98 }],
    });
    expect(result?.items).toHaveLength(1);
    expect(result?.items[0].quantity).toBe(1);
  });

  it('drops an item with a negative totalPrice', () => {
    const result = sanitizeLlmReceipt({
      items: [{ name: 'Leche', totalPrice: -0.98 }],
    });
    expect(result?.items).toHaveLength(0);
  });

  it('keeps an item with a totalPrice of exactly 0', () => {
    const result = sanitizeLlmReceipt({
      items: [{ name: 'Muestra gratis', totalPrice: 0 }],
    });
    expect(result?.items).toHaveLength(1);
    expect(result?.items[0].totalPrice).toBe(0);
  });
});

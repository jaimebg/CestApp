import { shouldRefine, decideOutcome } from '../trigger';
import type { ParsedReceipt } from '../../ocr/parser';

function receipt(overrides: Partial<ParsedReceipt> = {}): ParsedReceipt {
  return {
    storeName: 'Mercadona',
    storeAddress: null,
    date: new Date('2026-03-10'),
    time: '18:45',
    dateString: '10/03/2026',
    items: [
      { name: 'Leche', quantity: 1, unitPrice: 0.98, totalPrice: 0.98, unit: null, confidence: 80 },
    ],
    subtotal: null,
    tax: null,
    discount: null,
    total: 0.98,
    paymentMethod: 'card',
    rawText: '',
    confidence: 85,
    ...overrides,
  };
}

describe('shouldRefine', () => {
  it('does not fire on a clean, confident parse', () => {
    expect(shouldRefine(receipt())).toBe(false);
  });

  it('fires when there are no items', () => {
    expect(shouldRefine(receipt({ items: [] }))).toBe(true);
  });

  it('fires when the items sum does not match the total', () => {
    expect(shouldRefine(receipt({ total: 50 }))).toBe(true);
  });

  it('fires on low confidence even when the sum matches', () => {
    expect(shouldRefine(receipt({ confidence: 55 }))).toBe(true);
  });
});

describe('decideOutcome', () => {
  it('applies an auto outcome when the user has not edited', () => {
    expect(decideOutcome('auto', false)).toBe('apply');
  });

  it('degrades an auto outcome to a proposal once the user has edited', () => {
    expect(decideOutcome('auto', true)).toBe('propose');
  });

  it('keeps a proposal as a proposal', () => {
    expect(decideOutcome('proposal', false)).toBe('propose');
    expect(decideOutcome('proposal', true)).toBe('propose');
  });

  it('discards a none outcome', () => {
    expect(decideOutcome('none', false)).toBe('discard');
    expect(decideOutcome('none', true)).toBe('discard');
  });
});

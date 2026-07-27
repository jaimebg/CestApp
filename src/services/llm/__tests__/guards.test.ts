import {
  normalizeForAnchor,
  findSourceLine,
  isAnchoredToSource,
  filterHallucinatedItems,
} from '../guards';
import type { ParsedItem } from '../../ocr/parser';

const LINES = [
  'MERCADONA, S.A.',
  '1 HAC LECHE SEMI 1L 0,98',
  '2 PAN INTEGRAL 1,20 2,40',
  'TOTAL (€) 3,38',
];

function item(name: string, totalPrice: number): ParsedItem {
  return { name, quantity: 1, unitPrice: totalPrice, totalPrice, unit: null, confidence: 80 };
}

describe('normalizeForAnchor', () => {
  it('uppercases, strips accents and punctuation', () => {
    expect(normalizeForAnchor('Leche semidesnatada, 1L.')).toBe('LECHE SEMIDESNATADA 1L');
    expect(normalizeForAnchor('JAMÓN Ibérico')).toBe('JAMON IBERICO');
  });
});

describe('findSourceLine', () => {
  it('finds the line containing the price', () => {
    expect(findSourceLine(0.98, LINES)).toBe('1 HAC LECHE SEMI 1L 0,98');
  });

  it('matches the line total, not the unit price', () => {
    expect(findSourceLine(2.4, LINES)).toBe('2 PAN INTEGRAL 1,20 2,40');
  });

  it('returns null when the price is absent from the receipt', () => {
    expect(findSourceLine(9.99, LINES)).toBeNull();
  });
});

describe('isAnchoredToSource', () => {
  it('accepts a legitimately expanded name', () => {
    expect(isAnchoredToSource('Leche semidesnatada', '1 HAC LECHE SEMI 1L 0,98')).toBe(true);
  });

  it('accepts a verbatim name', () => {
    expect(isAnchoredToSource('PAN INTEGRAL', '2 PAN INTEGRAL 1,20 2,40')).toBe(true);
  });

  it('rejects a name sharing no token with its line', () => {
    expect(isAnchoredToSource('Detergente', '1 HAC LECHE SEMI 1L 0,98')).toBe(false);
  });

  it('ignores tokens shorter than three characters', () => {
    expect(isAnchoredToSource('1L de algo', '1 HAC LECHE SEMI 1L 0,98')).toBe(false);
  });
});

describe('filterHallucinatedItems', () => {
  it('keeps items anchored to the source text', () => {
    const kept = filterHallucinatedItems(
      [item('Leche semidesnatada', 0.98), item('Pan integral', 2.4)],
      LINES
    );
    expect(kept).toHaveLength(2);
  });

  it('drops an item whose price is absent from the receipt', () => {
    const kept = filterHallucinatedItems([item('Aceite de oliva', 9.99)], LINES);
    expect(kept).toHaveLength(0);
  });

  it('drops an invented item that reuses a real price', () => {
    const kept = filterHallucinatedItems([item('Detergente', 0.98)], LINES);
    expect(kept).toHaveLength(0);
  });
});

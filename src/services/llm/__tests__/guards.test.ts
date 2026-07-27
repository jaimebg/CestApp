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
  it('accepts a name that shares an exact token with an abbreviated line', () => {
    expect(isAnchoredToSource('Leche semidesnatada', '1 HAC LECHE SEMI 1L 0,98')).toBe(true);
  });

  it('accepts a name whose token is a genuine expansion of the line abbreviation', () => {
    expect(isAnchoredToSource('Detergente líquido', '1 DETERG LIQ 3,45')).toBe(true);
  });

  it('accepts a verbatim name', () => {
    expect(isAnchoredToSource('PAN INTEGRAL', '2 PAN INTEGRAL 1,20 2,40')).toBe(true);
  });

  it('rejects a name sharing no token with its line', () => {
    expect(isAnchoredToSource('Detergente', '1 HAC LECHE SEMI 1L 0,98')).toBe(false);
  });

  it('rejects an invented short name that is merely a prefix of an unrelated word', () => {
    expect(isAnchoredToSource('Sal', '1 SALSA BRAVA 1,20')).toBe(false);
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

  it('keeps two genuine items that share the same round price', () => {
    const sameSalePriceLines = ['3 YOGUR NATURAL 1,00', '4 QUESO FRESCO 1,00'];
    const kept = filterHallucinatedItems(
      [item('Yogur natural', 1.0), item('Queso fresco', 1.0)],
      sameSalePriceLines
    );
    expect(kept).toHaveLength(2);
    expect(kept.map((current) => current.name)).toEqual(['Yogur natural', 'Queso fresco']);
  });
});

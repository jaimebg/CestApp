import { containsKeyword, parsePrice, parseTime } from '../parseUtils';

describe('containsKeyword', () => {
  it('matches a keyword standing on its own', () => {
    expect(containsKeyword('iva 21% 4,20', 'iva')).toBe(true);
    expect(containsKeyword('total (€) 54,20', 'total')).toBe(true);
    expect(containsKeyword('tel: 928628756', 'tel')).toBe(true);
  });

  it('does not match a keyword buried inside a product name', () => {
    expect(containsKeyword('1 atún claro oliva pk6 4,75', 'iva')).toBe(false);
    expect(containsKeyword('1 aceite oliva virgen 6,90', 'iva')).toBe(false);
    expect(containsKeyword('1 nutella 400g 3,49', 'tel')).toBe(false);
    expect(containsKeyword('1 pastel de carne 2,10', 'tel')).toBe(false);
    expect(containsKeyword('1 ribera del duero 7,95', 'due')).toBe(false);
    expect(containsKeyword('1 cardo en conserva 1,85', 'card')).toBe(false);
    expect(containsKeyword('1 consumo responsable 1,00', 'sum')).toBe(false);
  });

  it('still matches keywords whose own edges are not word characters', () => {
    expect(containsKeyword('www.mercadona.es', 'www.')).toBe(true);
    expect(containsKeyword('atencion@mercadona.es', '@')).toBe(true);
    expect(containsKeyword('http://mercadona.es', 'http')).toBe(true);
    expect(containsKeyword('mercadona, s.a.', 's.a.')).toBe(true);
    expect(containsKeyword('c.i.f: a-46103834', 'c.i.f')).toBe(true);
  });

  it('handles repeated occurrences where only the later one is a whole word', () => {
    expect(containsKeyword('oliva iva 4,20', 'iva')).toBe(true);
  });

  it('still matches the Spanish plural of a keyword', () => {
    expect(containsKeyword('centros comerciales carrefour', 'centro')).toBe(true);
    expect(containsKeyword('centros comerciales carrefour', 'comercial')).toBe(true);
    expect(containsKeyword('totales 54,20', 'total')).toBe(true);
  });

  it('does not treat an arbitrary suffix as a plural', () => {
    expect(containsKeyword('1 cardo en conserva 1,85', 'card')).toBe(false);
    expect(containsKeyword('1 ribera del duero 7,95', 'due')).toBe(false);
    expect(containsKeyword('1 telas de cocina 2,00', 'tel')).toBe(false);
    expect(containsKeyword('1 aceitunas olivas 3,10', 'iva')).toBe(false);
  });
});

describe('parsePrice', () => {
  it('parses Spanish decimal comma format', () => {
    expect(parsePrice('12,34')).toBe(12.34);
    expect(parsePrice('0,98')).toBe(0.98);
  });

  it('parses dot decimal format', () => {
    expect(parsePrice('12.34')).toBe(12.34);
  });

  it('strips currency symbols', () => {
    expect(parsePrice('12,34 €')).toBe(12.34);
    expect(parsePrice('€12,34')).toBe(12.34);
    expect(parsePrice('$12.34')).toBe(12.34);
  });

  it('handles OCR space after decimal separator', () => {
    expect(parsePrice('12, 34')).toBe(12.34);
    expect(parsePrice('12. 34')).toBe(12.34);
  });

  it('handles trailing letters (units, currency codes)', () => {
    expect(parsePrice('2,04 B')).toBe(2.04);
  });

  it('rejects bare integers by default', () => {
    expect(parsePrice('12')).toBeNull();
  });

  it('accepts bare integers when allowed', () => {
    expect(parsePrice('12', { allowBareInteger: true })).toBe(12);
  });

  it('returns null for non-price text', () => {
    expect(parsePrice('LECHE ENTERA')).toBeNull();
    expect(parsePrice('')).toBeNull();
  });
});

describe('parseTime', () => {
  it('parses 24h format', () => {
    expect(parseTime('18:45')).toBe('18:45');
    expect(parseTime('OP: 18:45:12')).toBe('18:45');
  });

  it('pads single-digit hours', () => {
    expect(parseTime('9:05')).toBe('09:05');
  });

  it('parses AM/PM format', () => {
    expect(parseTime('2:30 PM')).toBe('14:30');
    expect(parseTime('12:15 am')).toBe('00:15');
    expect(parseTime('12:15 pm')).toBe('12:15');
  });

  it('parses 14h30 notation', () => {
    expect(parseTime('14h30')).toBe('14:30');
  });

  it('rejects invalid times', () => {
    expect(parseTime('25:99')).toBeNull();
    expect(parseTime('no time here')).toBeNull();
  });
});

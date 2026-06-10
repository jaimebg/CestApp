import { parsePrice, parseTime } from '../parseUtils';

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

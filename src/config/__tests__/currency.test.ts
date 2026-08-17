import { formatAmountInput, getCurrency, parseAmountInput, DEFAULT_CURRENCY } from '../currency';

const eur = getCurrency(DEFAULT_CURRENCY);

describe('parseAmountInput', () => {
  it('reads the comma the Spanish iOS decimal pad produces', () => {
    expect(parseAmountInput('0,7')).toBe(0.7);
    expect(parseAmountInput('12,50')).toBe(12.5);
    expect(parseAmountInput('1234,56')).toBe(1234.56);
  });

  it('still reads a dot, for hardware and non-Spanish keyboards', () => {
    expect(parseAmountInput('0.7')).toBe(0.7);
    expect(parseAmountInput('12.50')).toBe(12.5);
  });

  it('treats the last separator as the decimal one when both appear', () => {
    expect(parseAmountInput('1.234,56')).toBe(1234.56);
    expect(parseAmountInput('1,234.56')).toBe(1234.56);
  });

  it('accepts an integer with no separator', () => {
    expect(parseAmountInput('7')).toBe(7);
    expect(parseAmountInput('0')).toBe(0);
  });

  it('accepts partially typed amounts', () => {
    expect(parseAmountInput('3,')).toBe(3);
    expect(parseAmountInput(',5')).toBe(0.5);
  });

  it('ignores currency symbols and surrounding whitespace', () => {
    expect(parseAmountInput(' 12,50 € ')).toBe(12.5);
  });

  it('keeps the sign', () => {
    expect(parseAmountInput('-2,5')).toBe(-2.5);
  });

  it('returns null when there is no number to read', () => {
    expect(parseAmountInput('')).toBeNull();
    expect(parseAmountInput('   ')).toBeNull();
    expect(parseAmountInput(',')).toBeNull();
    expect(parseAmountInput('abc')).toBeNull();
    expect(parseAmountInput('€')).toBeNull();
  });

  it('distinguishes a real zero from unparseable text', () => {
    expect(parseAmountInput('0,00')).toBe(0);
    expect(parseAmountInput('nope')).toBeNull();
  });
});

describe('formatAmountInput', () => {
  it('seeds the field with the separator the keyboard can type', () => {
    expect(formatAmountInput(0.7, eur, 2)).toBe('0,70');
    expect(formatAmountInput(1234.5, eur, 2)).toBe('1234,50');
  });

  it('omits thousands grouping so the value round-trips through the field', () => {
    expect(parseAmountInput(formatAmountInput(1234.56, eur, 2))).toBe(1234.56);
  });

  it('keeps the natural precision when no decimals are requested', () => {
    expect(formatAmountInput(1, eur)).toBe('1');
    expect(formatAmountInput(0.5, eur)).toBe('0,5');
  });

  it('renders an empty field for a missing amount', () => {
    expect(formatAmountInput(null, eur, 2)).toBe('');
  });
});

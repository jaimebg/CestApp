import {
  formatAmountInput,
  formatPrice,
  getCurrency,
  getNumberLocale,
  parseAmountInput,
} from '../currency';

const es = getNumberLocale('es');
const en = getNumberLocale('en');

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
    expect(formatAmountInput(0.7, es, 2)).toBe('0,70');
    expect(formatAmountInput(1234.5, es, 2)).toBe('1234,50');
  });

  it('omits thousands grouping so the value round-trips through the field', () => {
    expect(parseAmountInput(formatAmountInput(1234.56, es, 2))).toBe(1234.56);
  });

  it('keeps the natural precision when no decimals are requested', () => {
    expect(formatAmountInput(1, es)).toBe('1');
    expect(formatAmountInput(0.5, es)).toBe('0,5');
  });

  it('renders an empty field for a missing amount', () => {
    expect(formatAmountInput(null, es, 2)).toBe('');
  });
});

describe('formatPrice', () => {
  it('keeps today’s euro format in Spanish', () => {
    expect(formatPrice(1234.5, getCurrency('EUR'), es)).toBe('1.234,50 €');
  });

  it('puts the euro first in English', () => {
    expect(formatPrice(12.34, getCurrency('EUR'), en)).toBe('€12.34');
  });

  it('formats pounds by the UI language', () => {
    expect(formatPrice(40, getCurrency('GBP'), es)).toBe('40,00 £');
    expect(formatPrice(40, getCurrency('GBP'), en)).toBe('£40.00');
  });

  it('spaces a letter symbol placed before the number', () => {
    expect(formatPrice(12, getCurrency('CHF'), en)).toBe('CHF 12.00');
  });

  it('puts the sign before the symbol', () => {
    expect(formatPrice(-3, getCurrency('EUR'), en)).toBe('-€3.00');
  });

  it('renders a dash for a missing amount', () => {
    expect(formatPrice(null, getCurrency('EUR'), es)).toBe('-');
  });
});

describe('getCurrency', () => {
  it('falls back to EUR for an unknown region currency', () => {
    expect(getCurrency('JPY').code).toBe('EUR');
    expect(getCurrency(undefined).code).toBe('EUR');
    expect(getCurrency(null).code).toBe('EUR');
  });
});

describe('formatAmountInput by language', () => {
  it('uses the language’s decimal separator', () => {
    expect(formatAmountInput(2.5, es, 2)).toBe('2,50');
    expect(formatAmountInput(2.5, en, 2)).toBe('2.50');
  });
});

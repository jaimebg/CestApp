/**
 * Currency Configuration
 * Each receipt keeps the currency it was paid in; amounts are written the way
 * the user's UI language writes numbers, whatever the receipt's country.
 */

export interface Currency {
  code: string;
  symbol: string;
  name: string;
  decimals: number;
  /** How the currency shows up printed on a receipt. */
  markers: RegExp[];
}

export const CURRENCIES: Record<string, Currency> = {
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', decimals: 2, markers: [/€/, /\bEUR\b/] },
  GBP: { code: 'GBP', symbol: '£', name: 'Pound sterling', decimals: 2, markers: [/£/, /\bGBP\b/] },
  USD: { code: 'USD', symbol: 'US$', name: 'US dollar', decimals: 2, markers: [/US\$/, /\bUSD\b/] },
  CHF: { code: 'CHF', symbol: 'CHF', name: 'Swiss franc', decimals: 2, markers: [/\bCHF\b/] },
  PLN: {
    code: 'PLN',
    symbol: 'zł',
    name: 'Polish złoty',
    decimals: 2,
    markers: [/zł/i, /\bPLN\b/],
  },
  MXN: {
    code: 'MXN',
    symbol: 'MX$',
    name: 'Mexican peso',
    decimals: 2,
    markers: [/MX\$/, /\bMXN\b/],
  },
};

export const DEFAULT_CURRENCY = 'EUR';

export interface NumberLocale {
  decimalSeparator: '.' | ',';
  thousandsSeparator: '.' | ',' | ' ' | '';
  symbolPosition: 'before' | 'after';
  symbolSpacing: boolean;
}

const NUMBER_LOCALES: Record<string, NumberLocale> = {
  es: {
    decimalSeparator: ',',
    thousandsSeparator: '.',
    symbolPosition: 'after',
    symbolSpacing: true,
  },
  en: {
    decimalSeparator: '.',
    thousandsSeparator: ',',
    symbolPosition: 'before',
    symbolSpacing: false,
  },
};

/**
 * How a UI language writes amounts. A language without an entry writes them
 * the English way; adding a UI language adds its entry here.
 */
export function getNumberLocale(language: string): NumberLocale {
  return NUMBER_LOCALES[language] ?? NUMBER_LOCALES.en;
}

/**
 * Format an amount in a currency, the way the given locale writes numbers
 */
export function formatPrice(
  amount: number | null,
  currency: Currency,
  locale: NumberLocale
): string {
  if (amount === null || amount === undefined) return '-';

  const fixed = Math.abs(amount).toFixed(currency.decimals);
  const [intPart, decPart] = fixed.split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, locale.thousandsSeparator);
  const number = currency.decimals > 0 ? `${grouped}${locale.decimalSeparator}${decPart}` : grouped;

  const sign = amount < 0 ? '-' : '';
  if (locale.symbolPosition === 'after') return `${sign}${number} ${currency.symbol}`;

  const spaced = locale.symbolSpacing || /[A-Za-z]/.test(currency.symbol);
  return `${sign}${currency.symbol}${spaced ? ' ' : ''}${number}`;
}

/**
 * Read a number out of a text field the user typed into.
 *
 * Accepts either decimal separator: the iOS decimal pad offers only the one for
 * the device locale, which in Spain is a comma, while a hardware keyboard gives
 * a dot. When both appear the last one is the decimal separator and the rest are
 * thousands grouping. Returns null when there is no number to read, so callers
 * can tell an empty or malformed field from a genuine zero.
 */
export function parseAmountInput(text: string): number | null {
  const cleaned = text.replace(/[^0-9.,-]/g, '');
  if (!cleaned) return null;

  const isNegative = cleaned.startsWith('-');
  const unsigned = cleaned.replace(/-/g, '');

  const lastSeparator = Math.max(unsigned.lastIndexOf('.'), unsigned.lastIndexOf(','));
  const hasSeparator = lastSeparator !== -1;

  const integerPart = (hasSeparator ? unsigned.slice(0, lastSeparator) : unsigned).replace(
    /[.,]/g,
    ''
  );
  const fractionPart = hasSeparator ? unsigned.slice(lastSeparator + 1).replace(/[.,]/g, '') : '';

  if (!integerPart && !fractionPart) return null;

  const value = Number(`${integerPart || '0'}.${fractionPart || '0'}`);
  if (!Number.isFinite(value)) return null;

  return isNegative ? -value : value;
}

/**
 * Render a number for an editable text field: the locale's decimal separator,
 * no symbol and no thousands grouping, so the value the user sees is one they
 * can retype and `parseAmountInput` reads back unchanged.
 *
 * Omit `decimals` to keep the number's own precision, for fields like quantity
 * where a trailing "1,00" would be noise.
 */
export function formatAmountInput(
  amount: number | null | undefined,
  locale: NumberLocale,
  decimals?: number
): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return '';

  const fixed = decimals === undefined ? String(amount) : amount.toFixed(decimals);

  return fixed.replace('.', locale.decimalSeparator);
}

/**
 * Get currency by code
 * Defaults to EUR for a missing or unknown code
 */
export function getCurrency(code: string | null | undefined): Currency {
  return (code && CURRENCIES[code.toUpperCase()]) || CURRENCIES.EUR;
}

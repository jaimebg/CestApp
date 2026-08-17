/**
 * Currency Configuration
 * Spain-focused: EUR is the only supported currency
 */

export interface Currency {
  code: string;
  symbol: string;
  name: string;
  symbolPosition: 'before' | 'after';
  decimalSeparator: '.' | ',';
  thousandsSeparator: ',' | '.' | ' ' | '' | "'";
  decimals: number;
}

export const CURRENCIES: Record<string, Currency> = {
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    symbolPosition: 'after',
    decimalSeparator: ',',
    thousandsSeparator: '.',
    decimals: 2,
  },
};

export const DEFAULT_CURRENCY = 'EUR';

/**
 * Format price with currency
 */
export function formatPrice(
  amount: number | null,
  currency: Currency,
  options?: { showCode?: boolean }
): string {
  if (amount === null || amount === undefined) return '-';

  const { symbol, symbolPosition, decimalSeparator, thousandsSeparator, decimals, code } = currency;

  const fixed = Math.abs(amount).toFixed(decimals);
  const [intPart, decPart] = fixed.split('.');

  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator);

  const formattedNumber =
    decimals > 0 ? `${formattedInt}${decimalSeparator}${decPart}` : formattedInt;

  const sign = amount < 0 ? '-' : '';

  const withSymbol =
    symbolPosition === 'before' ? `${symbol}${formattedNumber}` : `${formattedNumber} ${symbol}`;

  const result = options?.showCode ? `${withSymbol} ${code}` : withSymbol;

  return `${sign}${result}`;
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
 * Render a number for an editable text field: the currency's decimal separator,
 * no symbol and no thousands grouping, so the value the user sees is one they
 * can retype and `parseAmountInput` reads back unchanged.
 *
 * Omit `decimals` to keep the number's own precision, for fields like quantity
 * where a trailing "1,00" would be noise.
 */
export function formatAmountInput(
  amount: number | null | undefined,
  currency: Currency,
  decimals?: number
): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return '';

  const fixed = decimals === undefined ? String(amount) : amount.toFixed(decimals);

  return fixed.replace('.', currency.decimalSeparator);
}

/**
 * Get currency by code
 * Defaults to EUR if not found
 */
export function getCurrency(code: string): Currency {
  return CURRENCIES[code] || CURRENCIES.EUR;
}

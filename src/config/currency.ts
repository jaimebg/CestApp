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
 * Get currency by code
 * Defaults to EUR if not found
 */
export function getCurrency(code: string): Currency {
  return CURRENCIES[code] || CURRENCIES.EUR;
}

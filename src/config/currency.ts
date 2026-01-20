/**
 * Currency Configuration
 * Simplified for Spanish-focused receipt parsing
 * Primary: EUR | Display reference: USD
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

/**
 * Supported currencies
 * EUR: Primary currency for Spain
 * USD: Display reference for international comparison
 */
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
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    symbolPosition: 'before',
    decimalSeparator: '.',
    thousandsSeparator: ',',
    decimals: 2,
  },
};

/**
 * Default currency for Spain
 */
export const DEFAULT_CURRENCY = 'EUR';

/**
 * Spanish number formatting
 * Decimal separator: comma (,)
 * Thousands separator: period (.)
 */
export const SPANISH_NUMBER_FORMAT = {
  decimalSeparator: ',' as const,
  thousandsSeparator: '.' as const,
};

/**
 * Get default currency from locale
 * Simplified: Returns EUR for Spanish-speaking regions, USD otherwise
 */
export function getDefaultCurrencyFromLocale(
  regionCode: string | null,
  languageCode: string | null
): string {
  // Spanish-speaking European regions use EUR
  if (regionCode?.toUpperCase() === 'ES' || regionCode?.toUpperCase() === 'IC') {
    return 'EUR';
  }

  // Spanish language defaults to EUR (Spain origin)
  if (languageCode?.toLowerCase() === 'es') {
    return 'EUR';
  }

  // Default to EUR for this Spanish-focused app
  return 'EUR';
}

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
 * Get list of supported currencies
 */
export function getSupportedCurrencies(): Currency[] {
  return Object.values(CURRENCIES).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Get currency by code
 * Defaults to EUR if not found
 */
export function getCurrency(code: string): Currency {
  return CURRENCIES[code] || CURRENCIES.EUR;
}

/**
 * Parse a price string using Spanish format (comma decimal)
 * @param priceString - Price string like "12,50" or "1.234,50"
 * @returns Parsed number or null
 */
export function parseSpanishPrice(priceString: string): number | null {
  // Remove currency symbols and whitespace
  let cleaned = priceString.replace(/[$€£¥]/g, '').trim();

  // Remove thousands separators (periods in Spanish format)
  cleaned = cleaned.replace(/\./g, '');

  // Convert decimal comma to period
  cleaned = cleaned.replace(',', '.');

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

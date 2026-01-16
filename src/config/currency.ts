/**
 * Currency Configuration
 * Defines supported currencies and locale-based defaults
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

// Supported currencies
export const CURRENCIES: Record<string, Currency> = {
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    symbolPosition: 'before',
    decimalSeparator: '.',
    thousandsSeparator: ',',
    decimals: 2,
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    symbolPosition: 'after',
    decimalSeparator: ',',
    thousandsSeparator: '.',
    decimals: 2,
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    symbolPosition: 'before',
    decimalSeparator: '.',
    thousandsSeparator: ',',
    decimals: 2,
  },
  MXN: {
    code: 'MXN',
    symbol: '$',
    name: 'Mexican Peso',
    symbolPosition: 'before',
    decimalSeparator: '.',
    thousandsSeparator: ',',
    decimals: 2,
  },
  CAD: {
    code: 'CAD',
    symbol: '$',
    name: 'Canadian Dollar',
    symbolPosition: 'before',
    decimalSeparator: '.',
    thousandsSeparator: ',',
    decimals: 2,
  },
  AUD: {
    code: 'AUD',
    symbol: '$',
    name: 'Australian Dollar',
    symbolPosition: 'before',
    decimalSeparator: '.',
    thousandsSeparator: ',',
    decimals: 2,
  },
  JPY: {
    code: 'JPY',
    symbol: '¥',
    name: 'Japanese Yen',
    symbolPosition: 'before',
    decimalSeparator: '.',
    thousandsSeparator: ',',
    decimals: 0,
  },
  CNY: {
    code: 'CNY',
    symbol: '¥',
    name: 'Chinese Yuan',
    symbolPosition: 'before',
    decimalSeparator: '.',
    thousandsSeparator: ',',
    decimals: 2,
  },
  BRL: {
    code: 'BRL',
    symbol: 'R$',
    name: 'Brazilian Real',
    symbolPosition: 'before',
    decimalSeparator: ',',
    thousandsSeparator: '.',
    decimals: 2,
  },
  ARS: {
    code: 'ARS',
    symbol: '$',
    name: 'Argentine Peso',
    symbolPosition: 'before',
    decimalSeparator: ',',
    thousandsSeparator: '.',
    decimals: 2,
  },
  COP: {
    code: 'COP',
    symbol: '$',
    name: 'Colombian Peso',
    symbolPosition: 'before',
    decimalSeparator: ',',
    thousandsSeparator: '.',
    decimals: 0,
  },
  CLP: {
    code: 'CLP',
    symbol: '$',
    name: 'Chilean Peso',
    symbolPosition: 'before',
    decimalSeparator: ',',
    thousandsSeparator: '.',
    decimals: 0,
  },
  PEN: {
    code: 'PEN',
    symbol: 'S/',
    name: 'Peruvian Sol',
    symbolPosition: 'before',
    decimalSeparator: '.',
    thousandsSeparator: ',',
    decimals: 2,
  },
  INR: {
    code: 'INR',
    symbol: '₹',
    name: 'Indian Rupee',
    symbolPosition: 'before',
    decimalSeparator: '.',
    thousandsSeparator: ',',
    decimals: 2,
  },
  KRW: {
    code: 'KRW',
    symbol: '₩',
    name: 'South Korean Won',
    symbolPosition: 'before',
    decimalSeparator: '.',
    thousandsSeparator: ',',
    decimals: 0,
  },
  CHF: {
    code: 'CHF',
    symbol: 'Fr.',
    name: 'Swiss Franc',
    symbolPosition: 'before',
    decimalSeparator: '.',
    thousandsSeparator: "'",
    decimals: 2,
  },
};

// Map country/region codes to default currencies
const LOCALE_CURRENCY_MAP: Record<string, string> = {
  // North America
  US: 'USD',
  CA: 'CAD',
  MX: 'MXN',
  // Europe
  GB: 'GBP',
  DE: 'EUR',
  FR: 'EUR',
  IT: 'EUR',
  ES: 'EUR',
  NL: 'EUR',
  BE: 'EUR',
  AT: 'EUR',
  PT: 'EUR',
  IE: 'EUR',
  CH: 'CHF',
  // Asia Pacific
  JP: 'JPY',
  CN: 'CNY',
  KR: 'KRW',
  AU: 'AUD',
  IN: 'INR',
  // Latin America
  BR: 'BRL',
  AR: 'ARS',
  CO: 'COP',
  CL: 'CLP',
  PE: 'PEN',
};

// Language to default currency (fallback when region not available)
const LANGUAGE_CURRENCY_MAP: Record<string, string> = {
  en: 'USD',
  es: 'MXN',
  pt: 'BRL',
  fr: 'EUR',
  de: 'EUR',
  it: 'EUR',
  ja: 'JPY',
  zh: 'CNY',
  ko: 'KRW',
};

/**
 * Get default currency based on device locale
 */
export function getDefaultCurrencyFromLocale(
  regionCode: string | null,
  languageCode: string | null
): string {
  // First try region code
  if (regionCode && LOCALE_CURRENCY_MAP[regionCode.toUpperCase()]) {
    return LOCALE_CURRENCY_MAP[regionCode.toUpperCase()];
  }

  // Then try language code
  if (languageCode && LANGUAGE_CURRENCY_MAP[languageCode.toLowerCase()]) {
    return LANGUAGE_CURRENCY_MAP[languageCode.toLowerCase()];
  }

  // Default to USD
  return 'USD';
}

/**
 * Format a price with the given currency
 */
export function formatPrice(
  amount: number | null,
  currency: Currency,
  options?: { showCode?: boolean }
): string {
  if (amount === null || amount === undefined) return '-';

  const { symbol, symbolPosition, decimalSeparator, thousandsSeparator, decimals, code } = currency;

  // Format the number
  const fixed = Math.abs(amount).toFixed(decimals);
  const [intPart, decPart] = fixed.split('.');

  // Add thousands separator
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator);

  // Combine with decimal
  const formattedNumber = decimals > 0
    ? `${formattedInt}${decimalSeparator}${decPart}`
    : formattedInt;

  // Add sign for negative numbers
  const sign = amount < 0 ? '-' : '';

  // Add symbol
  const withSymbol = symbolPosition === 'before'
    ? `${symbol}${formattedNumber}`
    : `${formattedNumber} ${symbol}`;

  // Optionally add currency code
  const result = options?.showCode
    ? `${withSymbol} ${code}`
    : withSymbol;

  return `${sign}${result}`;
}

/**
 * Get list of all supported currencies for selection UI
 */
export function getSupportedCurrencies(): Currency[] {
  return Object.values(CURRENCIES).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Get currency by code
 */
export function getCurrency(code: string): Currency {
  return CURRENCIES[code] || CURRENCIES.USD;
}

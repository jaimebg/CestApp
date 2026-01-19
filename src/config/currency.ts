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
  IC: 'EUR', // Canary Islands (Spain)
  NL: 'EUR',
  BE: 'EUR',
  AT: 'EUR',
  PT: 'EUR',
  IE: 'EUR',
  GR: 'EUR',
  FI: 'EUR',
  LU: 'EUR',
  MT: 'EUR',
  CY: 'EUR',
  SK: 'EUR',
  SI: 'EUR',
  EE: 'EUR',
  LV: 'EUR',
  LT: 'EUR',
  CH: 'CHF',
  // Asia
  JP: 'JPY',
  CN: 'CNY',
  KR: 'KRW',
  // Oceania
  AU: 'AUD',
  NZ: 'AUD',
  // South Asia
  IN: 'INR',
  // Latin America
  BR: 'BRL',
  AR: 'ARS',
  CO: 'COP',
  CL: 'CLP',
  PE: 'PEN',
  VE: 'USD', // Venezuela uses USD widely due to inflation
  EC: 'USD', // Ecuador uses USD
  UY: 'USD',
  PY: 'USD',
  BO: 'USD',
  // Central America & Caribbean
  PA: 'USD', // Panama uses USD
  CR: 'USD',
  GT: 'USD',
  HN: 'USD',
  SV: 'USD', // El Salvador uses USD
  NI: 'USD',
  DO: 'USD',
  CU: 'USD',
  PR: 'USD', // Puerto Rico (US territory)
};

// Language fallback when region is unknown
// Uses the currency of the language's country of origin
const LANGUAGE_CURRENCY_MAP: Record<string, string> = {
  en: 'USD',
  es: 'EUR', // Spanish originates from Spain (EUR)
  pt: 'EUR', // Portuguese originates from Portugal (EUR)
  fr: 'EUR',
  de: 'EUR',
  it: 'EUR',
  ja: 'JPY',
  zh: 'CNY',
  ko: 'KRW',
};

export function getDefaultCurrencyFromLocale(
  regionCode: string | null,
  languageCode: string | null
): string {
  if (regionCode && LOCALE_CURRENCY_MAP[regionCode.toUpperCase()]) {
    return LOCALE_CURRENCY_MAP[regionCode.toUpperCase()];
  }

  if (languageCode && LANGUAGE_CURRENCY_MAP[languageCode.toLowerCase()]) {
    return LANGUAGE_CURRENCY_MAP[languageCode.toLowerCase()];
  }

  return 'USD';
}

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

export function getSupportedCurrencies(): Currency[] {
  return Object.values(CURRENCIES).sort((a, b) => a.name.localeCompare(b.name));
}

export function getCurrency(code: string): Currency {
  return CURRENCIES[code] || CURRENCIES.USD;
}

import { getCountry } from '../../config/countries';
import type { CountryDefinition } from '../../config/countries/types';
import { CURRENCIES } from '../../config/currency';
import { detectCountry, type CountryDetection } from './countryDetector';
import type { ParsedReceipt } from './parser';

/**
 * The currency a receipt was paid in: its country's, unless nothing pointed at
 * a country and the receipt prints another currency's mark.
 */
export function detectCurrency(
  text: string,
  country: CountryDefinition,
  method: CountryDetection['method']
): string {
  if (method !== 'default') return country.currency;

  const printed = Object.values(CURRENCIES).find(
    (currency) =>
      currency.code !== country.currency && currency.markers.some((marker) => marker.test(text))
  );
  return printed?.code ?? country.currency;
}

/**
 * Stamps a reading with the country and currency it came from. A detected
 * chain settles the country; otherwise the receipt's own text does.
 */
export function applyOrigin(result: ParsedReceipt, rawText: string): ParsedReceipt {
  const detection: CountryDetection =
    result.chainId && result.countryCode
      ? { code: result.countryCode, confidence: 100, method: 'tax_id' }
      : detectCountry(rawText);

  const country = getCountry(detection.code);
  return {
    ...result,
    countryCode: country.code,
    currency: detectCurrency(rawText, country, detection.method),
  };
}

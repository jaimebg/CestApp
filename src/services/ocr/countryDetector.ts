import { COUNTRIES, DEFAULT_COUNTRY } from '../../config/countries';
import type { CountryCode } from '../../config/countries/types';

export interface CountryDetection {
  code: CountryCode;
  confidence: number;
  method: 'tax_id' | 'signals' | 'default';
}

const TAX_ID_WEIGHT = 3;

function countMatches(text: string, patterns: RegExp[]): number {
  return patterns.filter((pattern) => pattern.test(text)).length;
}

/**
 * Which country a receipt comes from, judged from its own text: a tax ID shape
 * counts three times a country's other signals. With no signal, or a tie that
 * includes Spain, it stays Spain, as every receipt did before countries existed.
 */
export function detectCountry(text: string): CountryDetection {
  const scored = Object.values(COUNTRIES)
    .map((country) => {
      const taxIds = countMatches(text, country.taxIdPatterns);
      return {
        code: country.code,
        score: TAX_ID_WEIGHT * taxIds + countMatches(text, country.signals),
        byTaxId: taxIds > 0,
      };
    })
    .filter((entry) => entry.score > 0);

  const top = Math.max(0, ...scored.map((entry) => entry.score));
  const leaders = scored.filter((entry) => entry.score === top);

  const spainTied = leaders.length > 1 && leaders.some((entry) => entry.code === DEFAULT_COUNTRY);
  if (leaders.length === 0 || spainTied) {
    return { code: DEFAULT_COUNTRY, confidence: 50, method: 'default' };
  }

  const [winner] = leaders;
  return {
    code: winner.code,
    confidence: Math.min(95, 60 + 10 * winner.score),
    method: winner.byTaxId ? 'tax_id' : 'signals',
  };
}

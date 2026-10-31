/**
 * Every country CestApp can read and the chain templates that hang off each.
 * A new country is a folder beside `es/` and one line in each map below.
 */

import type { ChainTemplate, CountryCode, CountryDefinition } from './types';
import { SPAIN, SPAIN_CHAINS } from './es';

export type { ChainTemplate, CountryCode, CountryDefinition } from './types';

export const DEFAULT_COUNTRY: CountryCode = 'ES';

export const COUNTRIES: Partial<Record<CountryCode, CountryDefinition>> = {
  ES: SPAIN,
};

const CHAINS: ChainTemplate[] = [...SPAIN_CHAINS];

export function getCountry(code: CountryCode): CountryDefinition {
  return COUNTRIES[code] ?? SPAIN;
}

export function templateKey(template: ChainTemplate): string {
  return `${template.country}:${template.chainId}`;
}

/** Sorted by tier, then market share, so stronger chains are tried first. */
export function getAllTemplates(): ChainTemplate[] {
  return [...CHAINS].sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier;
    return (b.marketShare || 0) - (a.marketShare || 0);
  });
}

export function getChainTemplate(country: CountryCode, chainId: string): ChainTemplate | null {
  const id = chainId.toLowerCase();
  return CHAINS.find((t) => t.country === country && t.chainId === id) ?? null;
}

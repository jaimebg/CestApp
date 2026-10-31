/**
 * Regional Presets for Receipt Parsing
 * A country's keywords and number format, shared by the zone, spatial and generic parsers
 */

import { getCountry } from './countries';
import { SPAIN } from './countries/es/country';
import { detectCountry } from '../services/ocr/countryDetector';
import type { RegionalKeywords, RegionalPreset } from './countries/types';

export type { RegionalKeywords, RegionalPreset };

export const SPAIN_PRESET: RegionalPreset = SPAIN;

/**
 * Get the Spain preset (the only supported preset)
 */
export function getRegionalPreset(_id?: string): RegionalPreset {
  return SPAIN_PRESET;
}

/**
 * Get regional preset by country code
 * Returns Spain preset for ES, defaults to Spain for all others
 */
export function getPresetByCountryCode(_countryCode?: string): RegionalPreset {
  return SPAIN_PRESET;
}

/**
 * The country definition a receipt's text points at, Spain when nothing does
 */
export function detectRegionFromText(text: string): RegionalPreset {
  return getCountry(detectCountry(text).code);
}

/**
 * Check if a store name matches known stores in the preset
 */
export function matchStoreInPreset(
  storeName: string,
  preset: RegionalPreset = SPAIN_PRESET
): string | null {
  const normalizedName = storeName.toUpperCase().trim();

  for (const store of preset.commonStores) {
    // Exact match
    if (normalizedName === store) {
      return store;
    }
    // Store name contains the known store
    if (normalizedName.includes(store)) {
      return store;
    }
    // Known store contains the store name (for abbreviations)
    if (store.includes(normalizedName) && normalizedName.length >= 3) {
      return store;
    }
  }

  return null;
}

/**
 * Check if a keyword matches any of the preset's keywords for a specific category
 */
export function matchesKeyword(
  text: string,
  category: keyof RegionalKeywords,
  preset: RegionalPreset = SPAIN_PRESET
): boolean {
  const upperText = text.toUpperCase().trim();
  const keywords = preset.keywords[category];

  return keywords.some((keyword) => upperText.includes(keyword));
}

/**
 * Check if text should be skipped based on preset skip keywords
 */
export function shouldSkipText(text: string, preset: RegionalPreset = SPAIN_PRESET): boolean {
  const upperText = text.toUpperCase().trim();

  return preset.skipKeywords.some((keyword) => upperText.includes(keyword));
}

/**
 * Spanish Tax Regions Configuration
 * Defines tax rates for different Spanish territories:
 * - IVA (Peninsula/Baleares)
 * - IGIC (Canarias)
 * - IPSI (Ceuta/Melilla)
 */

export type TaxType = 'IVA' | 'IGIC' | 'IPSI';

export interface TaxRate {
  name: string;
  rate: number;
}

export interface TaxRegion {
  id: string;
  name: string;
  taxType: TaxType;
  rates: {
    superReduced: TaxRate;
    reduced: TaxRate;
    standard: TaxRate;
  };
  postalCodePrefixes: string[];
  keywords: string[];
  indicatorStores: string[];
}

/**
 * Peninsula & Balearic Islands (IVA)
 * Standard Spanish tax rates
 */
export const IVA_REGION: TaxRegion = {
  id: 'peninsula',
  name: 'Península y Baleares',
  taxType: 'IVA',
  rates: {
    superReduced: { name: 'IVA superreducido', rate: 4 },
    reduced: { name: 'IVA reducido', rate: 10 },
    standard: { name: 'IVA general', rate: 21 },
  },
  postalCodePrefixes: [
    '01',
    '02',
    '03',
    '04',
    '05',
    '06',
    '07',
    '08',
    '09',
    '10',
    '11',
    '12',
    '13',
    '14',
    '15',
    '16',
    '17',
    '18',
    '19',
    '20',
    '21',
    '22',
    '23',
    '24',
    '25',
    '26',
    '27',
    '28',
    '29',
    '30',
    '31',
    '32',
    '33',
    '34',
    '36',
    '37',
    '38',
    '39',
    '40',
    '41',
    '42',
    '43',
    '44',
    '45',
    '46',
    '47',
    '48',
    '49',
    '50',
  ],
  keywords: ['IVA', 'I.V.A.', 'I.V.A'],
  indicatorStores: [], // Most stores
};

/**
 * Canary Islands (IGIC)
 * Special tax regime for the Canary Islands
 */
export const IGIC_REGION: TaxRegion = {
  id: 'canarias',
  name: 'Canarias',
  taxType: 'IGIC',
  rates: {
    superReduced: { name: 'IGIC cero', rate: 0 },
    reduced: { name: 'IGIC reducido', rate: 3 },
    standard: { name: 'IGIC general', rate: 7 },
  },
  postalCodePrefixes: ['35', '38'], // Las Palmas and Santa Cruz de Tenerife
  keywords: ['IGIC', 'I.G.I.C.', 'I.G.I.C'],
  indicatorStores: [
    'HIPERDINO',
    'DINOSOL',
    'SPAR CANARIAS',
    'MERCADONA CANARIAS',
    'ALCAMPO CANARIAS',
    'LIDL CANARIAS',
    'LIDL-CANARIAS',
  ],
};

/**
 * Ceuta and Melilla (IPSI)
 * Special tax regime for Spanish territories in North Africa
 */
export const IPSI_REGION: TaxRegion = {
  id: 'ceuta_melilla',
  name: 'Ceuta y Melilla',
  taxType: 'IPSI',
  rates: {
    superReduced: { name: 'IPSI mínimo', rate: 0.5 },
    reduced: { name: 'IPSI reducido', rate: 4 },
    standard: { name: 'IPSI general', rate: 10 },
  },
  postalCodePrefixes: ['51', '52'], // Ceuta and Melilla
  keywords: ['IPSI', 'I.P.S.I.', 'I.P.S.I'],
  indicatorStores: [],
};

/**
 * All Spanish tax regions
 */
export const TAX_REGIONS: TaxRegion[] = [IVA_REGION, IGIC_REGION, IPSI_REGION];

/**
 * Detection result with confidence
 */
export interface TaxRegionDetection {
  region: TaxRegion;
  confidence: number;
  detectionMethod: 'postal_code' | 'tax_keyword' | 'store_name' | 'default';
}

/**
 * Detect tax region from postal code
 */
function detectFromPostalCode(postalCode: string): TaxRegionDetection | null {
  const prefix = postalCode.substring(0, 2);

  for (const region of TAX_REGIONS) {
    if (region.postalCodePrefixes.includes(prefix)) {
      return {
        region,
        confidence: 98,
        detectionMethod: 'postal_code',
      };
    }
  }

  return null;
}

/**
 * Detect tax region from tax keywords in text
 */
function detectFromTaxKeywords(text: string): TaxRegionDetection | null {
  const upperText = text.toUpperCase();
  const lowerText = text.toLowerCase();

  // Check for IGIC first (more specific than IVA)
  for (const keyword of IGIC_REGION.keywords) {
    if (upperText.includes(keyword)) {
      return {
        region: IGIC_REGION,
        confidence: 95,
        detectionMethod: 'tax_keyword',
      };
    }
  }

  // Check for Canarias-specific URLs (strong indicator)
  if (lowerText.includes('lidl-canarias.es') || lowerText.includes('canarias.es')) {
    return {
      region: IGIC_REGION,
      confidence: 95,
      detectionMethod: 'tax_keyword',
    };
  }

  // Check for IPSI
  for (const keyword of IPSI_REGION.keywords) {
    if (upperText.includes(keyword)) {
      return {
        region: IPSI_REGION,
        confidence: 95,
        detectionMethod: 'tax_keyword',
      };
    }
  }

  // Check for IVA (most common)
  for (const keyword of IVA_REGION.keywords) {
    if (upperText.includes(keyword)) {
      return {
        region: IVA_REGION,
        confidence: 90,
        detectionMethod: 'tax_keyword',
      };
    }
  }

  return null;
}

/**
 * Detect tax region from store name
 */
function detectFromStoreName(storeName: string): TaxRegionDetection | null {
  const upperName = storeName.toUpperCase();

  // Check Canary Islands specific stores
  for (const store of IGIC_REGION.indicatorStores) {
    if (upperName.includes(store) || store.includes(upperName)) {
      return {
        region: IGIC_REGION,
        confidence: 85,
        detectionMethod: 'store_name',
      };
    }
  }

  return null;
}

/**
 * Detect tax region from receipt text
 * Uses multiple detection strategies in order of reliability:
 * 1. Postal code prefix (98% confidence)
 * 2. Tax keywords (IGIC/IPSI/IVA) (90-95% confidence)
 * 3. Store name indicators (85% confidence)
 * 4. Default to IVA region (70% confidence)
 *
 * @param text - Receipt text to analyze
 * @param postalCode - Optional postal code if already extracted
 * @param storeName - Optional store name if already extracted
 */
export function detectTaxRegion(
  text: string,
  postalCode?: string | null,
  storeName?: string | null
): TaxRegionDetection {
  // Strategy 1: Postal code (most reliable)
  if (postalCode) {
    const postalResult = detectFromPostalCode(postalCode);
    if (postalResult) {
      return postalResult;
    }
  }

  // Try to extract postal code from text
  const postalMatch = text.match(/\b(0[1-9]|[1-4]\d|5[0-2])\d{3}\b/);
  if (postalMatch) {
    const extractedPostal = postalMatch[0];
    const postalResult = detectFromPostalCode(extractedPostal);
    if (postalResult) {
      return postalResult;
    }
  }

  // Strategy 2: Tax keywords
  const keywordResult = detectFromTaxKeywords(text);
  if (keywordResult) {
    return keywordResult;
  }

  // Strategy 3: Store name indicators
  if (storeName) {
    const storeResult = detectFromStoreName(storeName);
    if (storeResult) {
      return storeResult;
    }
  }

  // Strategy 4: Default to IVA (Peninsula)
  return {
    region: IVA_REGION,
    confidence: 70,
    detectionMethod: 'default',
  };
}

/**
 * Get all possible tax rates for a region
 */
export function getTaxRates(region: TaxRegion): number[] {
  return [region.rates.superReduced.rate, region.rates.reduced.rate, region.rates.standard.rate];
}

/**
 * Parse tax percentage from text and match to region rates
 */
export function matchTaxRate(percentage: number, region: TaxRegion): TaxRate | null {
  const rates = region.rates;
  const tolerance = 0.5; // Allow 0.5% tolerance for OCR errors

  if (Math.abs(percentage - rates.superReduced.rate) <= tolerance) {
    return rates.superReduced;
  }
  if (Math.abs(percentage - rates.reduced.rate) <= tolerance) {
    return rates.reduced;
  }
  if (Math.abs(percentage - rates.standard.rate) <= tolerance) {
    return rates.standard;
  }

  return null;
}

export type CountryCode = 'ES' | 'PT' | 'AT';

export interface RegionalKeywords {
  total: string[];
  subtotal: string[];
  tax: string[];
  discount: string[];
  quantity: string[];
  cash: string[];
  card: string[];
  change: string[];
  date: string[];
  time: string[];
}

export interface RegionalPreset {
  id: string;
  name: string;
  decimalSeparator: '.' | ',';
  thousandsSeparator: '.' | ',' | ' ' | '';
  dateFormat: 'DMY' | 'MDY' | 'YMD';
  currency: string;
  currencySymbol: string;
  taxRates: number[];
  keywords: RegionalKeywords;
  commonStores: string[];
  skipKeywords: string[];
}

export interface CountryDefinition extends RegionalPreset {
  code: CountryCode;
  /** Tax ID shapes printed on this country's receipts; the strongest country signal. */
  taxIdPatterns: RegExp[];
  /** Words or marks that point at this country when no tax ID is read. */
  signals: RegExp[];
}

/**
 * Receipt layout type
 */
export type LayoutType = 'columnar' | 'inline' | 'mixed';

/**
 * Price alignment in the receipt
 */
export type PriceAlignment = 'right' | 'left' | 'inline';

/**
 * Expected zones in the receipt
 */
export interface ExpectedZones {
  header: { startY: number; endY: number };
  items: { startY: number; endY: number };
  totals: { startY: number; endY: number };
  footer: { startY: number; endY: number };
}

/**
 * OCR correction rules specific to a chain
 */
export interface OcrCorrection {
  pattern: RegExp;
  replacement: string;
  description?: string;
}

/**
 * Item parsing pattern
 */
export interface ItemPattern {
  pattern: RegExp;
  groups: {
    name?: number;
    quantity?: number;
    unitPrice?: number;
    totalPrice?: number;
    unit?: number;
  };
  description?: string;
}

/**
 * Chain template definition
 */
export interface ChainTemplate {
  // Identification
  chainId: string;
  country: CountryCode;
  name: string;
  namePatterns: RegExp[];
  nifPatterns: string[];
  addressPatterns?: RegExp[];

  // Market info
  marketShare?: number;
  tier: 1 | 2 | 3;

  // Layout configuration
  layout: {
    type: LayoutType;
    priceAlignment: PriceAlignment;
    hasUnitPrices: boolean;
    hasQuantityColumn: boolean;
    expectedZones?: ExpectedZones;
  };

  // Parsing patterns
  parsing: {
    itemPatterns: ItemPattern[];
    quantityFormats: RegExp[];
    datePatterns: RegExp[];
    totalKeywords: string[];
    subtotalKeywords: string[];
    taxKeywords: string[];
    discountKeywords: string[];
  };

  // OCR corrections specific to this chain
  ocrCorrections: OcrCorrection[];

  // Tax configuration
  taxType: string;

  // Fingerprint patterns for detection when NIF/name fails
  fingerprints: RegExp[];
}

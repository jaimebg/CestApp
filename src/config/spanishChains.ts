/**
 * Spanish Supermarket Chain Templates
 * Chain-specific configurations for improved receipt parsing accuracy
 */

import type { TaxType } from './taxRegions';

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
  taxType: TaxType;

  // Fingerprint patterns for detection when NIF/name fails
  fingerprints: RegExp[];
}

/**
 * TIER 1 CHAINS (Critical - High Market Share)
 */

/**
 * Mercadona - Spain's largest supermarket chain (27.3% market share)
 * Known for: Consistent layout, unit prices shown, NIF A46103834
 */
export const MERCADONA_TEMPLATE: ChainTemplate = {
  chainId: 'mercadona',
  name: 'Mercadona',
  namePatterns: [/MERCADONA/i, /MERCADONA\s*S\.?A\.?/i],
  nifPatterns: ['A46103834'],
  tier: 1,
  marketShare: 27.3,

  layout: {
    type: 'columnar',
    priceAlignment: 'right',
    hasUnitPrices: true,
    hasQuantityColumn: true,
    expectedZones: {
      header: { startY: 0, endY: 0.15 },
      items: { startY: 0.15, endY: 0.75 },
      totals: { startY: 0.75, endY: 0.9 },
      footer: { startY: 0.9, endY: 1.0 },
    },
  },

  parsing: {
    itemPatterns: [
      // Standard item: NAME followed by price on same line or next
      {
        pattern: /^(.+?)\s+(\d+[,\.]\d{2})\s*€?$/,
        groups: { name: 1, totalPrice: 2 },
        description: 'Name + price on same line',
      },
      // Item with quantity: 2 x NAME @ 1,50
      {
        pattern: /^(\d+)\s*[xX×]\s*(.+?)\s*@?\s*(\d+[,\.]\d{2})/,
        groups: { quantity: 1, name: 2, unitPrice: 3 },
        description: 'Quantity x Name @ unit price',
      },
      // Weight item: 0,500 kg x 2,99 €/kg
      {
        pattern: /^(\d+[,\.]\d+)\s*(kg|g|l|ml)\s*[xX×]\s*(\d+[,\.]\d{2})/i,
        groups: { quantity: 1, unit: 2, unitPrice: 3 },
        description: 'Weight x unit price',
      },
    ],
    quantityFormats: [/^(\d+)\s*[xX×]/, /(\d+[,\.]\d+)\s*(kg|g|l|ml)/i, /(\d+)\s*ud[s]?\.?/i],
    datePatterns: [
      /(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{4})/,
      /(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{2})/,
    ],
    totalKeywords: ['TOTAL', 'TOTAL COMPRA', 'IMPORTE TOTAL', 'A PAGAR'],
    subtotalKeywords: ['SUBTOTAL', 'BASE IMPONIBLE', 'BASE'],
    taxKeywords: ['IVA', 'I.V.A.', 'CUOTA IVA'],
    discountKeywords: ['DESCUENTO', 'DTO', 'AHORRO', 'PROMOCION'],
  },

  ocrCorrections: [
    { pattern: /MERCAD0NA/gi, replacement: 'MERCADONA', description: 'Fix O->0' },
    { pattern: /MERCAD0NA/gi, replacement: 'MERCADONA', description: 'Fix O->0' },
    { pattern: /A461O3834/g, replacement: 'A46103834', description: 'Fix NIF O->0' },
  ],

  taxType: 'IVA',

  fingerprints: [
    /HACENDADO/i,
    /DELIPLUS/i,
    /BOSQUE VERDE/i,
    /COMPY/i,
    /precio\s*(?:con|sin)\s*tarjeta/i,
  ],
};

/**
 * Carrefour - Second largest chain (9.0% market share)
 * Known for: Variable layouts (hiper/super/express), multiple receipt formats
 */
export const CARREFOUR_TEMPLATE: ChainTemplate = {
  chainId: 'carrefour',
  name: 'Carrefour',
  namePatterns: [
    /CARREFOUR/i,
    /CARREFOUR\s*EXPRESS/i,
    /CARREFOUR\s*MARKET/i,
    /CARREFOUR\s*HIPER/i,
    /CENTROS\s*COMERCIALES\s*CARREFOUR/i,
  ],
  nifPatterns: ['A28425270', 'A78947579'],
  addressPatterns: [/CENTROS\s*COMERCIALES/i],
  tier: 1,
  marketShare: 9.0,

  layout: {
    type: 'mixed',
    priceAlignment: 'right',
    hasUnitPrices: true,
    hasQuantityColumn: true,
    expectedZones: {
      header: { startY: 0, endY: 0.18 },
      items: { startY: 0.18, endY: 0.72 },
      totals: { startY: 0.72, endY: 0.88 },
      footer: { startY: 0.88, endY: 1.0 },
    },
  },

  parsing: {
    itemPatterns: [
      {
        pattern: /^(.+?)\s+(\d+[,\.]\d{2})\s*€?\s*[A-Z]?$/,
        groups: { name: 1, totalPrice: 2 },
        description: 'Name + price + optional tax code',
      },
      {
        pattern: /^(\d+)\s*[xX×]\s*(.+?)\s+(\d+[,\.]\d{2})/,
        groups: { quantity: 1, name: 2, totalPrice: 3 },
        description: 'Quantity x Name + total',
      },
    ],
    quantityFormats: [/^(\d+)\s*[xX×]/, /(\d+[,\.]\d+)\s*(kg|g|l|ml)/i],
    datePatterns: [
      /(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{4})/,
      /(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{2})/,
    ],
    totalKeywords: ['TOTAL', 'TOTAL A PAGAR', 'IMPORTE', 'A PAGAR'],
    subtotalKeywords: ['SUBTOTAL', 'BASE IMPONIBLE'],
    taxKeywords: ['IVA', 'I.V.A.'],
    discountKeywords: ['DESCUENTO', 'AHORRO', 'PROMO', 'OFERTA', 'CLUB'],
  },

  ocrCorrections: [
    { pattern: /CARREF0UR/gi, replacement: 'CARREFOUR', description: 'Fix O->0' },
    { pattern: /CARREF0UR/gi, replacement: 'CARREFOUR', description: 'Fix O->0' },
  ],

  taxType: 'IVA',

  fingerprints: [
    /CARREFOUR\s*CLUB/i,
    /CLUB\s*CARREFOUR/i,
    /TARJETA\s*PASS/i,
    /CENTROS\s*COMERCIALES/i,
  ],
};

/**
 * Lidl - Third largest chain (6.9% market share)
 * Known for: Compact columnar layout, date format DD.MM.YY
 */
export const LIDL_TEMPLATE: ChainTemplate = {
  chainId: 'lidl',
  name: 'Lidl',
  namePatterns: [/LIDL/i, /LIDL\s*SUPERMERCADOS/i],
  nifPatterns: ['A60195278'],
  tier: 1,
  marketShare: 6.9,

  layout: {
    type: 'columnar',
    priceAlignment: 'right',
    hasUnitPrices: false,
    hasQuantityColumn: true,
    expectedZones: {
      header: { startY: 0, endY: 0.12 },
      items: { startY: 0.12, endY: 0.78 },
      totals: { startY: 0.78, endY: 0.92 },
      footer: { startY: 0.92, endY: 1.0 },
    },
  },

  parsing: {
    itemPatterns: [
      {
        pattern: /^(.+?)\s+(\d+[,\.]\d{2})\s*[AB]?$/,
        groups: { name: 1, totalPrice: 2 },
        description: 'Name + price + tax code (A/B)',
      },
      {
        pattern: /^(\d+)\s*[xX×]\s*(\d+[,\.]\d{2})\s+(.+)/,
        groups: { quantity: 1, unitPrice: 2, name: 3 },
        description: 'Qty x unit price + name',
      },
    ],
    quantityFormats: [/^(\d+)\s*[xX×]/, /(\d+[,\.]\d{3})\s*(kg)/i],
    datePatterns: [
      /(\d{2})\.(\d{2})\.(\d{2})(?!\d)/, // Lidl uses DD.MM.YY
      /(\d{2})[\/\-](\d{2})[\/\-](\d{4})/,
    ],
    totalKeywords: ['TOTAL', 'SUMME', 'IMPORTE'],
    subtotalKeywords: ['SUBTOTAL', 'NETO'],
    taxKeywords: ['IVA', 'MwSt'],
    discountKeywords: ['DESCUENTO', 'RABATT', 'AHORRO'],
  },

  ocrCorrections: [
    { pattern: /L1DL/gi, replacement: 'LIDL', description: 'Fix I->1' },
    { pattern: /LIDUL/gi, replacement: 'LIDL', description: 'Fix common OCR error' },
  ],

  taxType: 'IVA',

  fingerprints: [/LIDL\s*PLUS/i, /A60195278/, /EUR-Betrag/i],
};

/**
 * TIER 2 CHAINS (Medium Market Share)
 */

/**
 * Eroski - Basque cooperative (5.5% market share)
 */
export const EROSKI_TEMPLATE: ChainTemplate = {
  chainId: 'eroski',
  name: 'Eroski',
  namePatterns: [
    /EROSKI/i,
    /EROSKI\s*CENTER/i,
    /EROSKI\s*CITY/i,
    /EROSKI\s*RAPID/i,
    /CAPRABO/i, // Eroski owns Caprabo
  ],
  nifPatterns: ['F20033361', 'A08207769'], // Eroski and Caprabo
  tier: 2,
  marketShare: 5.5,

  layout: {
    type: 'columnar',
    priceAlignment: 'right',
    hasUnitPrices: true,
    hasQuantityColumn: true,
  },

  parsing: {
    itemPatterns: [
      {
        pattern: /^(.+?)\s+(\d+[,\.]\d{2})$/,
        groups: { name: 1, totalPrice: 2 },
      },
    ],
    quantityFormats: [/^(\d+)\s*[xX×]/, /(\d+[,\.]\d+)\s*(kg|g|l|ml)/i],
    datePatterns: [/(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{4})/],
    totalKeywords: ['TOTAL', 'TOTAL A PAGAR', 'IMPORTE'],
    subtotalKeywords: ['SUBTOTAL', 'BASE'],
    taxKeywords: ['IVA', 'I.V.A.'],
    discountKeywords: ['DESCUENTO', 'AHORRO', 'CLUB EROSKI'],
  },

  ocrCorrections: [{ pattern: /ER0SKI/gi, replacement: 'EROSKI' }],

  taxType: 'IVA',

  fingerprints: [/CLUB\s*EROSKI/i, /EROSKI\s*CLUB/i, /TRAVEL\s*CLUB/i],
};

/**
 * Dia - Discount chain (4.5% market share)
 */
export const DIA_TEMPLATE: ChainTemplate = {
  chainId: 'dia',
  name: 'Dia',
  namePatterns: [
    /^DIA$/i,
    /DIA\s*%/i,
    /DIA\s*MARKET/i,
    /DIA\s*MAXI/i,
    /DISTRIBUIDORA\s*INTERNACIONAL/i,
  ],
  nifPatterns: ['A28164754'],
  tier: 2,
  marketShare: 4.5,

  layout: {
    type: 'inline',
    priceAlignment: 'right',
    hasUnitPrices: false,
    hasQuantityColumn: false,
  },

  parsing: {
    itemPatterns: [
      {
        pattern: /^(.+?)\s+(\d+[,\.]\d{2})$/,
        groups: { name: 1, totalPrice: 2 },
      },
    ],
    quantityFormats: [/^(\d+)\s*[xX×]/],
    datePatterns: [/(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{4})/],
    totalKeywords: ['TOTAL', 'A PAGAR', 'IMPORTE'],
    subtotalKeywords: ['SUBTOTAL'],
    taxKeywords: ['IVA'],
    discountKeywords: ['DESCUENTO', 'AHORRO', 'CLUB DIA'],
  },

  ocrCorrections: [{ pattern: /D1A/gi, replacement: 'DIA' }],

  taxType: 'IVA',

  fingerprints: [/CLUB\s*DIA/i, /DIA\s*%/i],
};

/**
 * Consum - Valencian cooperative (3.8% market share)
 */
export const CONSUM_TEMPLATE: ChainTemplate = {
  chainId: 'consum',
  name: 'Consum',
  namePatterns: [
    /CONSUM/i,
    /CONSUM\s*S\.?\s*COOP/i,
    /CHARTER/i, // Consum franchise
  ],
  nifPatterns: ['F46078986'],
  tier: 2,
  marketShare: 3.8,

  layout: {
    type: 'columnar',
    priceAlignment: 'right',
    hasUnitPrices: true,
    hasQuantityColumn: true,
  },

  parsing: {
    itemPatterns: [
      {
        pattern: /^(.+?)\s+(\d+[,\.]\d{2})$/,
        groups: { name: 1, totalPrice: 2 },
      },
    ],
    quantityFormats: [/^(\d+)\s*[xX×]/, /(\d+[,\.]\d+)\s*(kg|g|l|ml)/i],
    datePatterns: [/(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{4})/],
    totalKeywords: ['TOTAL', 'TOTAL COMPRA', 'A PAGAR'],
    subtotalKeywords: ['SUBTOTAL', 'BASE'],
    taxKeywords: ['IVA', 'I.V.A.'],
    discountKeywords: ['DESCUENTO', 'AHORRO', 'SOCIO'],
  },

  ocrCorrections: [{ pattern: /C0NSUM/gi, replacement: 'CONSUM' }],

  taxType: 'IVA',

  fingerprints: [/SOCIO\s*CONSUM/i, /CONSUM\s*BASIC/i],
};

/**
 * Alcampo (Auchan Spain) - Hypermarket chain (3.2% market share)
 */
export const ALCAMPO_TEMPLATE: ChainTemplate = {
  chainId: 'alcampo',
  name: 'Alcampo',
  namePatterns: [/ALCAMPO/i, /ALCAMPO\s*S\.?A\.?/i, /AUCHAN/i],
  nifPatterns: ['A28581882'],
  tier: 2,
  marketShare: 3.2,

  layout: {
    type: 'columnar',
    priceAlignment: 'right',
    hasUnitPrices: true,
    hasQuantityColumn: true,
  },

  parsing: {
    itemPatterns: [
      {
        pattern: /^(.+?)\s+(\d+[,\.]\d{2})\s*€?$/,
        groups: { name: 1, totalPrice: 2 },
      },
    ],
    quantityFormats: [/^(\d+)\s*[xX×]/, /(\d+[,\.]\d+)\s*(kg|g|l|ml)/i],
    datePatterns: [/(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{4})/],
    totalKeywords: ['TOTAL', 'A PAGAR', 'IMPORTE'],
    subtotalKeywords: ['SUBTOTAL', 'BASE IMPONIBLE'],
    taxKeywords: ['IVA', 'I.V.A.'],
    discountKeywords: ['DESCUENTO', 'AHORRO', 'MI ALCAMPO'],
  },

  ocrCorrections: [{ pattern: /ALCAMP0/gi, replacement: 'ALCAMPO' }],

  taxType: 'IVA',

  fingerprints: [/MI\s*ALCAMPO/i, /AUCHAN\s*RETAIL/i],
};

/**
 * Aldi - German discount chain (2.8% market share)
 */
export const ALDI_TEMPLATE: ChainTemplate = {
  chainId: 'aldi',
  name: 'Aldi',
  namePatterns: [/ALDI/i, /ALDI\s*SUPERMERCADOS/i],
  nifPatterns: ['B82258301'],
  tier: 2,
  marketShare: 2.8,

  layout: {
    type: 'columnar',
    priceAlignment: 'right',
    hasUnitPrices: false,
    hasQuantityColumn: true,
  },

  parsing: {
    itemPatterns: [
      {
        pattern: /^(.+?)\s+(\d+[,\.]\d{2})\s*[AB]?$/,
        groups: { name: 1, totalPrice: 2 },
      },
    ],
    quantityFormats: [/^(\d+)\s*[xX×]/],
    datePatterns: [/(\d{2})\.(\d{2})\.(\d{2})(?!\d)/, /(\d{2})[\/\-](\d{2})[\/\-](\d{4})/],
    totalKeywords: ['TOTAL', 'SUMME', 'A PAGAR'],
    subtotalKeywords: ['SUBTOTAL', 'NETO'],
    taxKeywords: ['IVA', 'MwSt'],
    discountKeywords: ['DESCUENTO', 'RABATT'],
  },

  ocrCorrections: [{ pattern: /ALD1/gi, replacement: 'ALDI' }],

  taxType: 'IVA',

  fingerprints: [/ALDI\s*SUPERMERCADOS/i, /B82258301/],
};

/**
 * HiperDino - Canary Islands chain (Canarias-specific)
 */
export const HIPERDINO_TEMPLATE: ChainTemplate = {
  chainId: 'hiperdino',
  name: 'HiperDino',
  namePatterns: [/HIPERDINO/i, /HIPER\s*DINO/i, /DINOSOL/i, /SUPERDINO/i],
  nifPatterns: ['A35032517'], // DinoSol Supermercados
  tier: 2,
  marketShare: 2.1, // Dominant in Canarias

  layout: {
    type: 'columnar',
    priceAlignment: 'right',
    hasUnitPrices: true,
    hasQuantityColumn: true,
  },

  parsing: {
    itemPatterns: [
      {
        pattern: /^(.+?)\s+(\d+[,\.]\d{2})$/,
        groups: { name: 1, totalPrice: 2 },
      },
    ],
    quantityFormats: [/^(\d+)\s*[xX×]/, /(\d+[,\.]\d+)\s*(kg|g|l|ml)/i],
    datePatterns: [/(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{4})/],
    totalKeywords: ['TOTAL', 'A PAGAR', 'IMPORTE'],
    subtotalKeywords: ['SUBTOTAL', 'BASE'],
    taxKeywords: ['IGIC', 'I.G.I.C.'], // Canarias uses IGIC, not IVA
    discountKeywords: ['DESCUENTO', 'AHORRO', 'DINOPUNTOS'],
  },

  ocrCorrections: [
    { pattern: /H1PERDINO/gi, replacement: 'HIPERDINO' },
    { pattern: /D1NOSOL/gi, replacement: 'DINOSOL' },
  ],

  taxType: 'IGIC', // Canary Islands tax

  fingerprints: [/DINOPUNTOS/i, /DINOSOL/i, /IGIC/i],
};

/**
 * All chain templates indexed by chainId
 */
export const CHAIN_TEMPLATES: Record<string, ChainTemplate> = {
  mercadona: MERCADONA_TEMPLATE,
  carrefour: CARREFOUR_TEMPLATE,
  lidl: LIDL_TEMPLATE,
  eroski: EROSKI_TEMPLATE,
  dia: DIA_TEMPLATE,
  consum: CONSUM_TEMPLATE,
  alcampo: ALCAMPO_TEMPLATE,
  aldi: ALDI_TEMPLATE,
  hiperdino: HIPERDINO_TEMPLATE,
};

/**
 * All NIF patterns for quick lookup
 */
export const NIF_TO_CHAIN: Record<string, string> = {
  A46103834: 'mercadona',
  A28425270: 'carrefour',
  A78947579: 'carrefour',
  A60195278: 'lidl',
  F20033361: 'eroski',
  A08207769: 'eroski', // Caprabo
  A28164754: 'dia',
  F46078986: 'consum',
  A28581882: 'alcampo',
  B82258301: 'aldi',
  A35032517: 'hiperdino',
};

/**
 * Get template by chain ID
 */
export function getChainTemplate(chainId: string): ChainTemplate | null {
  return CHAIN_TEMPLATES[chainId.toLowerCase()] || null;
}

/**
 * Get all templates sorted by market share (tier)
 */
export function getAllTemplates(): ChainTemplate[] {
  return Object.values(CHAIN_TEMPLATES).sort((a, b) => {
    // Sort by tier first, then by market share
    if (a.tier !== b.tier) return a.tier - b.tier;
    return (b.marketShare || 0) - (a.marketShare || 0);
  });
}

/**
 * Get templates by tier
 */
export function getTemplatesByTier(tier: 1 | 2 | 3): ChainTemplate[] {
  return Object.values(CHAIN_TEMPLATES).filter((t) => t.tier === tier);
}

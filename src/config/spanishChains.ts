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
 * Known for: Consistent columnar layout with qty prefix, unit prices for qty>1
 * Format: "QTY PRODUCT_NAME [P.UNIT] TOTAL"
 * NIF: A-46103834 (with hyphen) or A46103834
 */
export const MERCADONA_TEMPLATE: ChainTemplate = {
  chainId: 'mercadona',
  name: 'Mercadona',
  namePatterns: [/MERCADONA/i, /MERCADONA\s*,?\s*S\.?A\.?/i],
  nifPatterns: ['A46103834', 'A-46103834'],
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
      // Type 1: Qty + Name + Unit Price + Total (e.g., "2 QUESO COTTAGE 1,35 2,70")
      {
        pattern: /^(\d+)\s+([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ0-9\s\.\/\-%+]+?)\s+(\d+,\d{2})\s+(\d+,\d{2})$/,
        groups: { quantity: 1, name: 2, unitPrice: 3, totalPrice: 4 },
        description: 'Qty + Name + unit price + total price',
      },
      // Type 2: Qty + Name + Total only (e.g., "1 MINI PIZZAS 2,90")
      {
        pattern: /^(\d+)\s+([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ0-9\s\.\/\-%+]+?)\s+(\d+,\d{2})$/,
        groups: { quantity: 1, name: 2, totalPrice: 3 },
        description: 'Qty + Name + total price',
      },
      // Type 3: Weighted product line 2 (e.g., "1,102 kg 1,85 €/kg 2,04")
      {
        pattern: /^\s*(\d+,\d{3})\s*(kg|g|l|ml)\s+(\d+,\d{2})\s*€?\/(kg|g|l|ml)\s+(\d+,\d{2})$/i,
        groups: { quantity: 1, unit: 2, unitPrice: 3, totalPrice: 5 },
        description: 'Weight unit + price/unit + total (weighted products)',
      },
      // Type 4: Weighted product alternate (e.g., "0,530 kg 2,20 €/kg 1,17")
      {
        pattern: /^\s*(\d+[,\.]\d+)\s*(kg)\s+(\d+[,\.]\d{2})\s*€?\/kg\s+(\d+[,\.]\d{2})$/i,
        groups: { quantity: 1, unit: 2, unitPrice: 3, totalPrice: 4 },
        description: 'Weight kg + price/kg + total',
      },
      // Fallback: Name + price on same line (generic)
      {
        pattern: /^(.+?)\s+(\d+,\d{2})$/,
        groups: { name: 1, totalPrice: 2 },
        description: 'Name + price fallback',
      },
    ],
    quantityFormats: [
      /^(\d+)\s+[A-Z]/, // Qty at start before product name
      /(\d+,\d{3})\s*(kg|g|l|ml)/i, // Weight with 3 decimals
      /(\d+)\s*ud[s]?\.?/i, // Units
    ],
    datePatterns: [
      /(\d{2})\/(\d{2})\/(\d{4})/, // DD/MM/YYYY (primary format)
      /(\d{2})-(\d{2})-(\d{4})/, // DD-MM-YYYY
      /(\d{2})\.(\d{2})\.(\d{4})/, // DD.MM.YYYY
      /(\d{2})\/(\d{2})\/(\d{2})(?!\d)/, // DD/MM/YY
    ],
    totalKeywords: ['TOTAL (€)', 'TOTAL', 'TOTAL COMPRA', 'IMPORTE', 'A PAGAR'],
    subtotalKeywords: ['SUBTOTAL', 'BASE IMPONIBLE', 'BASE'],
    taxKeywords: ['IVA', 'I.V.A.', 'CUOTA IVA', 'IGIC', 'I.G.I.C.', 'CUOTA'],
    discountKeywords: ['DESCUENTO', 'DTO', 'AHORRO', 'PROMOCION', 'OFERTA'],
  },

  ocrCorrections: [
    { pattern: /MERCAD0NA/gi, replacement: 'MERCADONA', description: 'Fix O->0' },
    { pattern: /A-?461O3834/g, replacement: 'A-46103834', description: 'Fix NIF O->0' },
    { pattern: /€\/KG/gi, replacement: '€/kg', description: 'Normalize unit' },
  ],

  taxType: 'IVA',

  fingerprints: [
    /HACENDADO/i,
    /DELIPLUS/i,
    /BOSQUE VERDE/i,
    /COMPY/i,
    /FACTURA\s*SIMPLIFICADA/i,
    /COMERCIANTE\s*MINORISTA/i,
    /800\s*500\s*220/i,
    /SE\s*ADMITEN\s*DEVOLUCIONES/i,
    /TARJETA\s*BANCARIA/i,
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
    /SUPERMERCADOS\s*CHAMPION/i,
  ],
  nifPatterns: ['A28425270', 'A78947579', 'A28090108'],
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
      // Type 1: Name + price + optional tax code (e.g., "AGUA BEZOYA 1,5 L 0,69" or "AGUA SOLAN CABRAS EH70")
      {
        pattern: /^(.+?)\s+(\d+[,\.]\d{2})\s*€?$/,
        groups: { name: 1, totalPrice: 2 },
        description: 'Name + price (simple item)',
      },
      // Type 2: Name + tax code + price (e.g., "AGUA SOLAN CABRAS EH70 1,94")
      {
        pattern: /^(.+?)\s+[A-Z]{2}\d{2}\s+(\d+[,\.]\d{2})$/,
        groups: { name: 1, totalPrice: 2 },
        description: 'Name + tax code + price',
      },
      // Type 3: Qty + Name + price (e.g., "2 BOLIS SUPER GRIP 3,39")
      {
        pattern: /^(\d+)\s+([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ0-9\s\.\/\-%]+?)\s+(\d+[,\.]\d{2})$/,
        groups: { quantity: 1, name: 2, totalPrice: 3 },
        description: 'Qty + Name + price',
      },
      // Type 4: Quantity x Name + total (e.g., "2 x ( 0,97 )")
      {
        pattern: /^(\d+)\s*[xX×]\s*\(\s*(\d+[,\.]\d{2})\s*\)/,
        groups: { quantity: 1, unitPrice: 2 },
        description: 'Quantity x (unit price) - continuation line',
      },
      // Type 5: Name + price + tax code (e.g., "GALLETAS TUC CRACKER 1,08")
      {
        pattern: /^([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ0-9\s\.\/\-%]+?)\s+(\d+[,\.]\d{2})\s*[A-Z]?$/,
        groups: { name: 1, totalPrice: 2 },
        description: 'Name + price + optional single tax letter',
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
    discountKeywords: [
      'DESCUENTO',
      'DESCUENTO EN 2ª UNIDAD',
      'DESCUENTO EN 2A UNIDAD',
      'AHORRO',
      'PROMO',
      'OFERTA',
      'CLUB',
      'VENTAJAS OBTENIDAS',
      'ACUMULADO CLUB',
    ],
  },

  ocrCorrections: [{ pattern: /CARREF0UR/gi, replacement: 'CARREFOUR', description: 'Fix O->0' }],

  taxType: 'IVA',

  fingerprints: [
    /CARREFOUR\s*CLUB/i,
    /CLUB\s*CARREFOUR/i,
    /SOCIO\s*CLUB\s*CARREFOUR/i,
    /TARJETA\s*PASS/i,
    /CENTROS\s*COMERCIALES/i,
    /SUPERMERCADOS\s*CHAMPION/i,
    /VENTAJAS\s*OBTENIDAS/i,
    /ACUMULADO\s*CLUB/i,
    /TOTAL\s*VENTAJAS\s*EN\s*ESTA\s*COMPRA/i,
    /www\.pass\.carrefour/i,
    /NRF:\s*N\d+/i,
  ],
};

/**
 * Lidl - Third largest chain (6.9% market share)
 * Known for: Compact columnar layout, date format DD.MM.YY
 *
 * Receipt formats identified:
 * - Items with qty: "Nombre   precio_unitx   cantidad   total" (e.g., "Milbona/Leche sin la  0,91x   6   5,46")
 * - Simple items: "Nombre   precio" (e.g., "Floralys/Papel higiénico   4,35")
 * - Weighted items: Name line + "X,XXX kg x Y,YY   EUR/kg" on next line
 * - Lidl Plus discounts: "Dto. Lidl Plus   -X,XX" on separate line
 * - Percentage discounts: "Descuento XX%   -X,XX"
 * - Private brands: Milbona, Alesto, Solevita, Floralys, Kania, Cien, etc.
 * - Canarias stores: lidl-canarias.es uses IGIC instead of IVA
 */
export const LIDL_TEMPLATE: ChainTemplate = {
  chainId: 'lidl',
  name: 'Lidl',
  namePatterns: [/LIDL/i, /LIDL\s*SUPERMERCADOS/i, /LIDL\s*SUPERMERCADOS\s*S\.?A\.?U?/i],
  nifPatterns: ['A60195278'],
  tier: 1,
  marketShare: 6.9,

  layout: {
    type: 'columnar',
    priceAlignment: 'right',
    hasUnitPrices: true,
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
      // Type 1: Name + unit_price x + quantity + total (e.g., "Milbona/Leche sin la  0,91x   6   5,46")
      {
        pattern: /^(.+?)\s+(\d+[,\.]\d{2})x\s+(\d+)\s+(\d+[,\.]\d{2})$/,
        groups: { name: 1, unitPrice: 2, quantity: 3, totalPrice: 4 },
        description: 'Name + unit_price x qty + total (Lidl format)',
      },
      // Type 2: Name with weight + unit_price x + quantity + total (e.g., "Naranja 2 kg   3,15")
      {
        pattern: /^(.+?\d+\s*(?:kg|g|l|ml))\s+(\d+[,\.]\d{2})$/,
        groups: { name: 1, totalPrice: 2 },
        description: 'Name with weight + price',
      },
      // Type 3: Weighted product line (e.g., "0,656 kg x 2,65   EUR/kg")
      {
        pattern: /^\s*(\d+[,\.]\d{3})\s*(kg|g|l|ml)\s*x\s*(\d+[,\.]\d{2})\s*EUR\/(kg|g|l|ml)$/i,
        groups: { quantity: 1, unit: 2, unitPrice: 3 },
        description: 'Weight x price/unit (weighted products continuation)',
      },
      // Type 4: Simple name + price (e.g., "Floralys/Papel higiénico   4,35")
      {
        pattern: /^(.+?)\s+(\d+[,\.]\d{2})$/,
        groups: { name: 1, totalPrice: 2 },
        description: 'Name + price fallback',
      },
    ],
    quantityFormats: [
      /(\d+[,\.]\d{2})x\s+(\d+)/, // Lidl format: price x qty
      /(\d+[,\.]\d{3})\s*(kg|g|l|ml)/i, // Weight with 3 decimals
    ],
    datePatterns: [
      /(\d{2})\.(\d{2})\.(\d{2})(?!\d)/, // Lidl uses DD.MM.YY (e.g., 20.08.24)
      /(\d{2})[\/\-](\d{2})[\/\-](\d{4})/, // DD/MM/YYYY fallback
      /(\d{2})\.(\d{2})\.(\d{4})/, // DD.MM.YYYY
    ],
    totalKeywords: ['TOTAL', 'SUMME', 'IMPORTE'],
    subtotalKeywords: ['SUBTOTAL', 'NETO'],
    taxKeywords: ['IVA', 'IGIC', 'MwSt'],
    discountKeywords: [
      'DESCUENTO',
      'DTO',
      'DTO.',
      'LIDL PLUS',
      'DTO. LIDL PLUS',
      'AHORRO',
      'RABATT',
    ],
  },

  ocrCorrections: [
    { pattern: /L1DL/gi, replacement: 'LIDL', description: 'Fix I->1' },
    { pattern: /LIDUL/gi, replacement: 'LIDL', description: 'Fix common OCR error' },
    { pattern: /LlDL/gi, replacement: 'LIDL', description: 'Fix l->I' },
    { pattern: /EUR\/KG/gi, replacement: 'EUR/kg', description: 'Normalize unit' },
    { pattern: /EUR\/G/gi, replacement: 'EUR/g', description: 'Normalize unit' },
  ],

  taxType: 'IVA',

  fingerprints: [
    /LIDL\s*PLUS/i,
    /DTO\.?\s*LIDL\s*PLUS/i,
    /A60195278/,
    /lidl-canarias\.es/i,
    /MILBONA/i,
    /ALESTO/i,
    /SOLEVITA/i,
    /FLORALYS/i,
    /FAVORINA/i,
    /SNACK\s*DAY/i,
    /CROWNFIELD/i,
    /CIEN\//i,
    /KANIA/i,
    /BELBAKE/i,
    /NIXE/i,
    /REALVALLE/i,
    /CAMPO\s*LARGO/i,
    /MONISSA/i,
    /AEROCELL/i,
    /AROMATA/i,
    /GRACIAS\s*POR\s*SU\s*VISITA/i,
    /COMERCIO\s*MINORISTA/i,
  ],
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
 * Includes variants with and without hyphens
 */
export const NIF_TO_CHAIN: Record<string, string> = {
  A46103834: 'mercadona',
  'A-46103834': 'mercadona',
  A28425270: 'carrefour',
  A78947579: 'carrefour',
  A28090108: 'carrefour',
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

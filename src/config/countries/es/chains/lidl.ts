import type { ChainTemplate } from '../../types';

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
export const LIDL: ChainTemplate = {
  chainId: 'lidl',
  country: 'ES',
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
    {
      // The receipt sets this line in a lighter blue than the products, and a
      // recognizer reads its l's as ones: "Oto. L101 Plus", "Dto. L1d1 Plus".
      pattern: /\b[DO]to\.?\s*L[i1l][d0][li1]\s*Plus\b/gi,
      replacement: 'Dto. Lidl Plus',
      description: 'Normalize the Lidl Plus discount label',
    },
    {
      pattern: /\bwww\.l[i1l][d0][li1]-canarias\.es\b/gi,
      replacement: 'www.lidl-canarias.es',
      description: 'Normalize the Canarias domain used to place the tax region',
    },
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

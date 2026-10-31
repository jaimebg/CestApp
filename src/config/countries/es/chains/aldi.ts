import type { ChainTemplate } from '../../types';

/**
 * Aldi - German discount chain (2.8% market share)
 */
export const ALDI: ChainTemplate = {
  chainId: 'aldi',
  country: 'ES',
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

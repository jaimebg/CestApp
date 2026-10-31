import type { ChainTemplate } from '../../types';

/**
 * Alcampo (Auchan Spain) - Hypermarket chain (3.2% market share)
 */
export const ALCAMPO: ChainTemplate = {
  chainId: 'alcampo',
  country: 'ES',
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

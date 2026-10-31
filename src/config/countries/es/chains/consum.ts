import type { ChainTemplate } from '../../types';

/**
 * Consum - Valencian cooperative (3.8% market share)
 */
export const CONSUM: ChainTemplate = {
  chainId: 'consum',
  country: 'ES',
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

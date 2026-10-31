import type { ChainTemplate } from '../../types';

/**
 * Eroski - Basque cooperative (5.5% market share)
 */
export const EROSKI: ChainTemplate = {
  chainId: 'eroski',
  country: 'ES',
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

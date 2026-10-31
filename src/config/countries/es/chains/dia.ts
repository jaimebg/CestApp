import type { ChainTemplate } from '../../types';

/**
 * Dia - Discount chain (4.5% market share)
 */
export const DIA: ChainTemplate = {
  chainId: 'dia',
  country: 'ES',
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

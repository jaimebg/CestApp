import type { ChainTemplate } from '../../types';

/**
 * HiperDino - Canary Islands chain (Canarias-specific)
 */
export const HIPERDINO: ChainTemplate = {
  chainId: 'hiperdino',
  country: 'ES',
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

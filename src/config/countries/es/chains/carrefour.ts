import type { ChainTemplate } from '../../types';

/**
 * Carrefour - Second largest chain (9.0% market share)
 * Known for: Variable layouts (hiper/super/express), multiple receipt formats
 */
export const CARREFOUR: ChainTemplate = {
  chainId: 'carrefour',
  country: 'ES',
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

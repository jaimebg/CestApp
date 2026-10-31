import type { ChainTemplate } from '../../types';

/**
 * Mercadona - Spain's largest supermarket chain (27.3% market share)
 * Known for: Consistent columnar layout with qty prefix, unit prices for qty>1
 * Format: "QTY PRODUCT_NAME [P.UNIT] TOTAL"
 * NIF: A-46103834 (with hyphen) or A46103834
 */
export const MERCADONA: ChainTemplate = {
  chainId: 'mercadona',
  country: 'ES',
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
        pattern: /^(\d+)\s+([A-ZÁÉÍÓÚÑ0-9][A-ZÁÉÍÓÚÑ0-9\s\.\/\-%+]+?)\s+(\d+,\d{2})\s+(\d+,\d{2})$/,
        groups: { quantity: 1, name: 2, unitPrice: 3, totalPrice: 4 },
        description: 'Qty + Name + unit price + total price',
      },
      // Type 2: Qty + Name + Total only (e.g., "1 MINI PIZZAS 2,90")
      {
        pattern: /^(\d+)\s+([A-ZÁÉÍÓÚÑ0-9][A-ZÁÉÍÓÚÑ0-9\s\.\/\-%+]+?)\s+(\d+,\d{2})$/,
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

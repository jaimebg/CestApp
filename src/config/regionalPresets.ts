/**
 * Regional Presets for Receipt Parsing
 * Pre-configured settings optimized for specific regions
 */

export interface RegionalKeywords {
  total: string[];
  subtotal: string[];
  tax: string[];
  discount: string[];
  quantity: string[];
  cash: string[];
  card: string[];
  change: string[];
  date: string[];
  time: string[];
}

export interface RegionalPreset {
  id: string;
  name: string;
  decimalSeparator: '.' | ',';
  thousandsSeparator: '.' | ',' | ' ' | '';
  dateFormat: 'DMY' | 'MDY' | 'YMD';
  currency: string;
  currencySymbol: string;
  taxRates: number[];
  keywords: RegionalKeywords;
  commonStores: string[];
  skipKeywords: string[];
}

/**
 * Spain Regional Preset
 * Optimized for Spanish receipts with EUR currency
 */
export const SPAIN_PRESET: RegionalPreset = {
  id: 'spain',
  name: 'Spain',
  decimalSeparator: ',',
  thousandsSeparator: '.',
  dateFormat: 'DMY',
  currency: 'EUR',
  currencySymbol: '€',
  taxRates: [4, 10, 21], // IVA rates: super-reduced, reduced, standard

  keywords: {
    total: [
      'TOTAL',
      'IMPORTE',
      'A PAGAR',
      'SUMA',
      'TOTAL COMPRA',
      'TOTAL A PAGAR',
      'IMPORTE TOTAL',
      'TOTAL EUR',
      'TOTAL €',
    ],
    subtotal: ['SUBTOTAL', 'BASE IMPONIBLE', 'SUMA PARCIAL', 'BASE', 'NETO', 'IMPORTE NETO'],
    tax: [
      'IVA',
      'I.V.A.',
      'I.V.A',
      'IMPUESTO',
      'CUOTA IVA',
      'IVA 21%',
      'IVA 10%',
      'IVA 4%',
      'CUOTA',
    ],
    discount: [
      'DESCUENTO',
      'DTO',
      'DTO.',
      'AHORRO',
      'OFERTA',
      'PROMOCION',
      'PROMO',
      'REBAJA',
      '-',
      'BONIFICACION',
      'VALE',
      'CUPON',
    ],
    quantity: [
      'UDS',
      'UDS.',
      'UNID',
      'UNID.',
      'UNIDADES',
      'X',
      'KG',
      'GR',
      'G',
      'L',
      'LT',
      'ML',
      'LITROS',
      'KILOS',
      'GRAMOS',
    ],
    cash: ['EFECTIVO', 'METALICO', 'CONTADO', 'DINERO', 'EN EFECTIVO'],
    card: [
      'TARJETA',
      'VISA',
      'MASTERCARD',
      'DEBITO',
      'CREDITO',
      'DÉBITO',
      'CRÉDITO',
      'T. CREDITO',
      'T. DEBITO',
      'CONTACTLESS',
      'PAGO TARJETA',
    ],
    change: ['CAMBIO', 'ENTREGADO', 'DEVOLUCION', 'VUELTO', 'ENTREGA'],
    date: ['FECHA', 'FECHA:', 'DIA'],
    time: ['HORA', 'HORA:'],
  },

  // Common Spanish supermarkets and stores
  commonStores: [
    'MERCADONA',
    'CARREFOUR',
    'LIDL',
    'ALDI',
    'DIA',
    'EROSKI',
    'EL CORTE INGLES',
    'EL CORTE INGLÉS',
    'ALCAMPO',
    'CONSUM',
    'BONAREA',
    'BONÀREA',
    'HIPERCOR',
    'SUPERCOR',
    'SIMPLY',
    'AHORRAMAS',
    'MAS',
    'MASYMAS',
    'COVIRAN',
    'SPAR',
    'BM SUPERMERCADOS',
    'CAPRABO',
    'CONDIS',
    'FROIZ',
    'GADIS',
    'LUPA',
    'ALIMERKA',
    'FAMILIA',
    'SUPERSOL',
    'CASH FRESH',
    'CASH & CARRY',
  ],

  // Keywords to skip when parsing item names
  skipKeywords: [
    'TICKET',
    'RECIBO',
    'FACTURA',
    'SIMPLIFICADA',
    'TIENDA',
    'TELEFONO',
    'TELÉFONO',
    'TEL',
    'TEL.',
    'DIRECCION',
    'DIRECCIÓN',
    'CAJERO',
    'CAJA',
    'TERMINAL',
    'OPERACION',
    'OPERACIÓN',
    'CLIENTE',
    'SOCIO',
    'TARJETA SOCIO',
    'NUMERO',
    'NÚMERO',
    'NIF',
    'CIF',
    'C.I.F',
    'N.I.F',
    'GRACIAS',
    'VUELVA',
    'PRONTO',
    'BIENVENIDO',
    'CONSERVE',
    'TICKET',
    'GARANTIA',
    'GARANTÍA',
    'DEVOLUCIONES',
    'HORARIO',
    'ABIERTO',
    'LUNES',
    'MARTES',
    'MIERCOLES',
    'JUEVES',
    'VIERNES',
    'SABADO',
    'DOMINGO',
    'FESTIVO',
    'WWW',
    'HTTP',
    '@',
    'EMAIL',
    'CORREO',
  ],
};

/**
 * All available regional presets
 */
export const REGIONAL_PRESETS: Record<string, RegionalPreset> = {
  spain: SPAIN_PRESET,
};

/**
 * Get regional preset by ID
 */
export function getRegionalPreset(id: string): RegionalPreset | null {
  return REGIONAL_PRESETS[id.toLowerCase()] || null;
}

/**
 * Get regional preset by country code (ISO 3166-1 alpha-2)
 */
export function getPresetByCountryCode(countryCode: string): RegionalPreset | null {
  const mapping: Record<string, string> = {
    ES: 'spain',
    // Future presets can be added here
    // DE: 'germany',
    // FR: 'france',
    // IT: 'italy',
    // US: 'usa',
  };

  const presetId = mapping[countryCode.toUpperCase()];
  return presetId ? REGIONAL_PRESETS[presetId] : null;
}

/**
 * Detect if text contains keywords from a specific region
 */
export function detectRegionFromText(text: string): RegionalPreset | null {
  const lowerText = text.toLowerCase();

  // Check for Spain-specific indicators
  const spainIndicators = [
    'iva',
    'i.v.a',
    'importe',
    'mercadona',
    'carrefour',
    'lidl',
    'eroski',
    'dia',
    'alcampo',
    'euros',
    '€',
    'nif',
    'cif',
    'total',
    'precio',
    'unidades',
  ];

  const matchedIndicators = spainIndicators.filter((indicator) => lowerText.includes(indicator));

  // Debug log
  if (__DEV__ && matchedIndicators.length > 0) {
    console.log('[RegionalPresets] Spain indicators found:', matchedIndicators);
  }

  // If we find multiple Spain indicators, use Spain preset
  if (matchedIndicators.length >= 2) {
    if (__DEV__) {
      console.log('[RegionalPresets] Using SPAIN preset');
    }
    return SPAIN_PRESET;
  }

  return null;
}

/**
 * Check if a store name matches known stores in a preset
 */
export function matchStoreInPreset(storeName: string, preset: RegionalPreset): string | null {
  const normalizedName = storeName.toUpperCase().trim();

  for (const store of preset.commonStores) {
    // Exact match
    if (normalizedName === store) {
      return store;
    }
    // Store name contains the known store
    if (normalizedName.includes(store)) {
      return store;
    }
    // Known store contains the store name (for abbreviations)
    if (store.includes(normalizedName) && normalizedName.length >= 3) {
      return store;
    }
  }

  return null;
}

/**
 * Check if a keyword matches any of the preset's keywords for a specific category
 */
export function matchesKeyword(
  text: string,
  category: keyof RegionalKeywords,
  preset: RegionalPreset
): boolean {
  const upperText = text.toUpperCase().trim();
  const keywords = preset.keywords[category];

  return keywords.some((keyword) => upperText.includes(keyword));
}

/**
 * Check if text should be skipped based on preset skip keywords
 */
export function shouldSkipText(text: string, preset: RegionalPreset): boolean {
  const upperText = text.toUpperCase().trim();

  return preset.skipKeywords.some((keyword) => upperText.includes(keyword));
}

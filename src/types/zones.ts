export type ZoneType =
  | 'product_names'
  | 'prices'
  | 'quantities'
  | 'total'
  | 'date'
  | 'store_name'
  | 'tax'
  | 'subtotal';

export interface NormalizedBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ZoneDefinition {
  id: string;
  type: ZoneType;
  boundingBox: NormalizedBoundingBox;
  isRequired: boolean;
}

export interface ParsingHints {
  decimalSeparator?: '.' | ',';
  dateFormat?: 'DMY' | 'MDY' | 'YMD';
  currencySymbol?: string;
}

export const ZONE_COLORS: Record<ZoneType, string> = {
  product_names: '#93BD57',
  prices: '#FBE580',
  quantities: '#5B9BD5',
  total: '#C94444',
  date: '#9B59B6',
  store_name: '#E67E22',
  tax: '#1ABC9C',
  subtotal: '#34495E',
};

export const ZONE_LABELS: Record<ZoneType, { en: string; es: string }> = {
  product_names: { en: 'Product Names', es: 'Nombres de Productos' },
  prices: { en: 'Prices', es: 'Precios' },
  quantities: { en: 'Quantities', es: 'Cantidades' },
  total: { en: 'Total', es: 'Total' },
  date: { en: 'Date', es: 'Fecha' },
  store_name: { en: 'Store Name', es: 'Nombre de Tienda' },
  tax: { en: 'Tax', es: 'Impuesto' },
  subtotal: { en: 'Subtotal', es: 'Subtotal' },
};

export const ZONE_ICONS: Record<ZoneType, string> = {
  product_names: 'package',
  prices: 'dollar-sign',
  quantities: 'hash',
  total: 'credit-card',
  date: 'calendar',
  store_name: 'shopping-bag',
  tax: 'percent',
  subtotal: 'file-text',
};

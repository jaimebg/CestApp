import type { ParsedItem } from '../ocr/parser';
import type { LlmReceipt } from './types';

/**
 * Deliberately a subset of ParsedItem['unit']: 'lb' and 'oz' are omitted because
 * CestApp is Spain-only and imperial units never appear on a Spanish receipt.
 * Offering them to the model would only invite wrong answers.
 */
const UNITS: ParsedItem['unit'][] = ['each', 'kg', 'g', 'l', 'ml'];
const LLM_ITEM_CONFIDENCE = 70;

export const RECEIPT_SCHEMA = {
  type: 'object',
  properties: {
    storeName: { type: 'string', description: 'Nombre del supermercado' },
    date: { type: 'string', description: 'Fecha en formato DD/MM/YYYY' },
    time: { type: 'string', description: 'Hora en formato HH:MM' },
    total: { type: 'number', description: 'Importe total pagado en euros' },
    items: {
      type: 'array',
      description: 'Productos comprados, uno por linea del ticket',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Nombre del producto' },
          quantity: { type: 'number', description: 'Unidades o peso' },
          unitPrice: { type: 'number', description: 'Precio por unidad en euros' },
          totalPrice: { type: 'number', description: 'Precio total de la linea en euros' },
          unit: { type: 'string', enum: ['each', 'kg', 'g', 'l', 'ml'] },
        },
        required: ['name', 'totalPrice'],
      },
    },
  },
  required: ['items'],
};

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asUnit(value: unknown): ParsedItem['unit'] {
  return UNITS.includes(value as ParsedItem['unit']) ? (value as ParsedItem['unit']) : null;
}

function sanitizeItem(raw: unknown): ParsedItem | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const record = raw as Record<string, unknown>;

  const name = asString(record.name);
  const totalPrice = asNumber(record.totalPrice);
  if (name === null || totalPrice === null || totalPrice < 0) return null;

  const declaredQuantity = asNumber(record.quantity);
  const quantity = declaredQuantity !== null && declaredQuantity > 0 ? declaredQuantity : 1;
  const unitPrice = asNumber(record.unitPrice) ?? totalPrice / quantity;

  return {
    name,
    quantity,
    unitPrice,
    totalPrice,
    unit: asUnit(record.unit),
    confidence: LLM_ITEM_CONFIDENCE,
  };
}

/**
 * Converts the raw model output into a typed LlmReceipt, discarding anything
 * malformed. Returns null when the payload is unusable as a whole.
 */
export function sanitizeLlmReceipt(raw: unknown): LlmReceipt | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const record = raw as Record<string, unknown>;

  if (!Array.isArray(record.items)) return null;

  const items = record.items
    .map(sanitizeItem)
    .filter((current): current is ParsedItem => current !== null);

  return {
    storeName: asString(record.storeName),
    date: asString(record.date),
    time: asString(record.time),
    total: asNumber(record.total),
    items,
  };
}

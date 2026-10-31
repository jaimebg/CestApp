import type { FiscalReceipt } from './types';

function fields(payload: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const part of payload.split('*')) {
    const colon = part.indexOf(':');
    if (colon > 0) map.set(part.slice(0, colon), part.slice(colon + 1));
  }
  return map;
}

/**
 * Reads the QR code Portaria 195/2020 requires on Portuguese receipts:
 * `*`-separated `KEY:value` fields, of which A is the issuer's NIF, F the date
 * (YYYYMMDD), H the ATCUD and O the document total with taxes.
 */
export function parsePortugalQr(payload: string): FiscalReceipt | null {
  const f = fields(payload);
  const nif = f.get('A');
  const date = f.get('F')?.match(/^(\d{4})(\d{2})(\d{2})$/);
  const total = f.get('O');

  if (!nif || !/^\d{9}$/.test(nif) || !date || !f.get('H') || !total) return null;
  if (!/^-?\d+(\.\d{1,2})?$/.test(total)) return null;

  const [, year, month, day] = date.map(Number);
  const saleDate = new Date(year, month - 1, day);
  if (saleDate.getMonth() !== month - 1) return null;

  return {
    source: 'pt-atcud',
    countryCode: 'PT',
    total: Math.round(Number(total) * 100) / 100,
    date: saleDate,
    time: null,
    merchantTaxId: nif,
  };
}

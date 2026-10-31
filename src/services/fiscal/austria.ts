import type { FiscalReceipt } from './types';

const AMOUNT = /^-?\d+,\d{2}$/;

/**
 * Reads the machine-readable code the RKSV requires on Austrian receipts:
 * `_R1-AT<n>_<register>_<receipt no.>_<date-time>_<five VAT-rate amounts>_…`.
 * The total is the sum of the five amounts; the code names no merchant tax ID.
 */
export function parseAustriaQr(payload: string): FiscalReceipt | null {
  const fields = payload.replace(/^_/, '').split('_');
  if (fields.length < 9 || !/^R1-AT\d$/.test(fields[0])) return null;

  const stamp = fields[3].match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):\d{2}$/);
  const amounts = fields.slice(4, 9);
  if (!stamp || !amounts.every((amount) => AMOUNT.test(amount))) return null;

  const [, year, month, day, hour, minute] = stamp;
  const saleDate = new Date(Number(year), Number(month) - 1, Number(day));
  if (saleDate.getMonth() !== Number(month) - 1 || saleDate.getDate() !== Number(day)) return null;
  if (Number(hour) > 23 || Number(minute) > 59) return null;
  const cents = amounts.reduce(
    (sum, amount) => sum + Math.round(Number(amount.replace(',', '.')) * 100),
    0
  );

  return {
    source: 'at-rksv',
    countryCode: 'AT',
    total: cents / 100,
    date: saleDate,
    time: `${hour}:${minute}`,
    merchantTaxId: null,
  };
}

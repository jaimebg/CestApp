import type { CountryCode } from '../../config/countries/types';

/**
 * What a fiscal QR code printed on a receipt states, read offline from the
 * code itself. It is the tax authority's record, so it outranks OCR.
 */
export interface FiscalReceipt {
  source: 'pt-atcud' | 'at-rksv';
  countryCode: CountryCode;
  total: number;
  /** Local calendar date of the sale, at midnight. */
  date: Date;
  /** "hh:mm" when the code carries it. */
  time: string | null;
  merchantTaxId: string | null;
}

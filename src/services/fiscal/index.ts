import { parseAustriaQr } from './austria';
import { parsePortugalQr } from './portugal';
import type { FiscalReceipt } from './types';

export type { FiscalReceipt } from './types';

const PARSERS = [parsePortugalQr, parseAustriaQr];

/** The first decoded QR payload that is a fiscal code CestApp can read. */
export function parseFiscalQr(payloads: string[]): FiscalReceipt | null {
  for (const payload of payloads) {
    for (const parse of PARSERS) {
      const fiscal = parse(payload.trim());
      if (fiscal) return fiscal;
    }
  }
  return null;
}

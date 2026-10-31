/**
 * A chain fixture: one donated capture, scrubbed, with the figure printed on
 * the receipt. Fixtures live in `src/config/countries/<cc>/__tests__/fixtures/`
 * and test themselves (see `chainFixtures.test.ts`), so a contributor adds a
 * template and its fixtures without writing test code.
 */

import type { CountryCode } from '../../config/countries/types';
import type { MlkitText } from '../ocr/imageOcr';
import type { ParsedReceipt } from '../ocr/parser';
import { replayReading } from './replay';
import { SCRUB_VERSION, scrubRaw } from './scrub';
import type { BenchDimensions, BenchRecord } from './types';

/** How far the parsed basket may miss the printed figure: ML Kit misreads digits. */
export const BASKET_TOLERANCE = 0.02;

export interface ChainFixture {
  scrubbedBy: typeof SCRUB_VERSION;
  country: CountryCode;
  chainId: string;
  /** The donation issue the capture came from. */
  donation: string;
  printed: { subtotal: number | null; total: number };
  knownDimensions: BenchDimensions;
  raw: MlkitText;
}

export function fixtureFromRecord(
  record: BenchRecord,
  meta: Omit<ChainFixture, 'scrubbedBy' | 'knownDimensions' | 'raw'>
): ChainFixture {
  return {
    scrubbedBy: SCRUB_VERSION,
    ...meta,
    knownDimensions: record.knownDimensions,
    raw: scrubRaw(record.raw),
  };
}

export function readFixture(fixture: ChainFixture): ParsedReceipt | null {
  return replayReading(fixture.raw, fixture.knownDimensions);
}

/** Whether the parsed items add up to the printed subtotal, else total, within tolerance. */
export function basketWithinTolerance(
  parsed: ParsedReceipt,
  printed: ChainFixture['printed']
): boolean {
  const target = printed.subtotal ?? printed.total;
  const sum = parsed.items.reduce((total, item) => total + item.totalPrice, 0);
  return Math.abs(sum - target) <= target * BASKET_TOLERANCE;
}

/**
 * A figure typed by the person who read the photo, with either decimal
 * separator ("23,45" or "23.45"). Throws rather than writing a fixture that
 * would fail later with a confusing message.
 */
export function parsePrintedAmount(text: string): number {
  const trimmed = text.trim();
  if (!/^\d+([.,]\d{1,2})?$/.test(trimmed)) throw new Error(`"${text}" is not an amount`);
  return Number(trimmed.replace(',', '.'));
}

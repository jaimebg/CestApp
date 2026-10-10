import { detectImageZones, toOcrResult } from '../ocr/imageOcr';
import { parseCapture } from '../ocr/parseCapture';
import type { ParsedReceipt, ParserOptions } from '../ocr/parser';
import type { BenchRecord } from './types';

/** The options the review screen reads with: day-first dates and a decimal comma. */
export const REVIEW_PARSER_OPTIONS: ParserOptions = {
  preferredDateFormat: 'DMY',
  preferredDecimalSeparator: ',',
};

/**
 * Reads a recorded capture again through the app's own steps after the
 * recognizer (rows, zones, then the parse the review screen opens with), so
 * a change to any of them shows up in the score.
 */
export function replayRecord(record: BenchRecord): ParsedReceipt | null {
  const ocr = toOcrResult(record.raw, record.knownDimensions);
  if (ocr.text.length === 0) return null;

  const { dimensions, zones, detectedTotal } = detectImageZones(ocr, record.knownDimensions);

  return parseCapture({
    lines: ocr.lines,
    blocks: ocr.blocks,
    ocrText: ocr.text,
    dimensions,
    zones,
    detectedTotal,
    options: REVIEW_PARSER_OPTIONS,
  });
}

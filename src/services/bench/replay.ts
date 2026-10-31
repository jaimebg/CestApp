import { detectImageZones, toOcrResult, type MlkitText } from '../ocr/imageOcr';
import { parseCapture } from '../ocr/parseCapture';
import type { ParsedReceipt, ParserOptions } from '../ocr/parser';
import type { BenchDimensions, BenchRecord } from './types';

/** The options the review screen reads with: day-first dates and a decimal comma. */
export const REVIEW_PARSER_OPTIONS: ParserOptions = {
  preferredDateFormat: 'DMY',
  preferredDecimalSeparator: ',',
};

/**
 * Reads a recognizer result again through the app's own steps after the
 * recognizer (rows, zones, then the parse the review screen opens with), so
 * a change to any of them shows up in the score.
 */
export function replayReading(
  raw: MlkitText,
  knownDimensions: BenchDimensions
): ParsedReceipt | null {
  const ocr = toOcrResult(raw, knownDimensions);
  if (ocr.text.length === 0) return null;

  const { dimensions, zones, detectedTotal } = detectImageZones(ocr, knownDimensions);

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

export function replayRecord(record: BenchRecord): ParsedReceipt | null {
  return replayReading(record.raw, record.knownDimensions);
}

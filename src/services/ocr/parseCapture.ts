import { createScopedLogger } from '../../utils/debug';
import { parseReceipt, type ParsedReceipt, type ParserOptions } from './parser';
import { parseWithTemplate, parseWithSpatialCorrelation } from './templateParser';
import type { StoreParsingTemplate } from '../../db/schema/storeParsingTemplates';
import type { OcrBlock } from './index';
import type { ZoneDefinition } from '../../types/zones';

const logger = createScopedLogger('ParseCapture');

interface Dimensions {
  width: number;
  height: number;
}

export interface CaptureParseInput {
  lines: string[];
  blocks: OcrBlock[];
  ocrText: string;
  /** The space the blocks are positioned in. Zones are read in this space too. */
  dimensions: Dimensions;
  zones: ZoneDefinition[];
  /** The total the zone detector read straight off the receipt, if it found one. */
  detectedTotal: number | null;
  options?: ParserOptions;
}

/**
 * A template the receipt is read through once, standing in for a stored one so
 * a set of zones can be used without first being saved against a store.
 */
function oneOffTemplate(zones: ZoneDefinition[], dimensions: Dimensions): StoreParsingTemplate {
  return {
    id: 0,
    storeId: 0,
    zones,
    parsingHints: null,
    sampleImagePath: null,
    templateImageDimensions: dimensions,
    fingerprint: null,
    confidence: 70,
    useCount: 0,
    successCount: 0,
    failureCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as StoreParsingTemplate;
}

/**
 * The total to store, given what the parse read and what the zone detector read.
 *
 * The detector reads the total off a single region, so it survives receipts
 * whose layout defeats the line parser. It only wins where the parsed figure
 * is missing, implausibly small, or further from the items than it is.
 */
function resolveTotal(parsed: ParsedReceipt, detectedTotal: number): number {
  const parsedTotal = parsed.total || 0;
  const itemsSum = parsed.items.reduce((sum, item) => sum + item.totalPrice, 0);

  const preferDetected =
    parsedTotal === 0 ||
    (parsedTotal < 10 && detectedTotal > 10) ||
    (itemsSum > 0 && Math.abs(detectedTotal - itemsSum) < Math.abs(parsedTotal - itemsSum));

  if (preferDetected) {
    logger.log('Overriding total with the detected value:', { parsedTotal, detectedTotal });
    return detectedTotal;
  }

  return parsedTotal;
}

/**
 * Reads a receipt out of a processed capture, through the most informed route
 * the capture supports: its zones, else the geometry of its blocks, else its
 * lines alone.
 */
export function parseCapture(input: CaptureParseInput): ParsedReceipt | null {
  const { lines, blocks, ocrText, dimensions, zones, detectedTotal, options } = input;

  if (lines.length === 0) return null;

  const rawText = ocrText || lines.join('\n');
  const hasGeometry = blocks.length > 0 && dimensions.width > 0 && dimensions.height > 0;

  let result: ParsedReceipt;

  if (zones.length > 0 && hasGeometry) {
    logger.log('Reading through', zones.length, 'zones');
    result = parseWithTemplate(blocks, oneOffTemplate(zones, dimensions), rawText, dimensions);
  } else if (hasGeometry) {
    logger.log('Reading through block geometry');
    result = parseWithSpatialCorrelation(blocks, rawText, dimensions);
  } else {
    logger.log('Reading through lines alone');
    result = parseReceipt(lines, options);
  }

  if (detectedTotal !== null) {
    return { ...result, total: resolveTotal(result, detectedTotal) };
  }

  return result;
}

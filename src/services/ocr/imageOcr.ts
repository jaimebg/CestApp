import type {
  Rect as MlkitRect,
  Text as MlkitText,
} from '@infinitered/react-native-mlkit-text-recognition';
import { createScopedLogger } from '../../utils/debug';
import { autoDetectZones } from './autoZoneDetector';
import { reconstructRows } from './rowReconstructor';
import type { OcrBlock, OcrResult } from './index';
import type { ZoneDefinition } from '../../types/zones';

const logger = createScopedLogger('OCR');

export type { MlkitText };

interface Dimensions {
  width: number;
  height: number;
}

export interface ImageZones {
  /** The space the blocks and zones are positioned in. */
  dimensions: Dimensions;
  zones: ZoneDefinition[];
  detectedTotal: number | null;
}

function rectToBoundingBox(frame: MlkitRect) {
  return {
    left: frame.left,
    top: frame.top,
    width: frame.right - frame.left,
    height: frame.bottom - frame.top,
  };
}

/**
 * Maps ML Kit's result into the app's shape, keeping the original as `raw`.
 * It is kept apart from the native call so the reading benchmark can replay a
 * recorded result through exactly the code the app ran.
 * @param knownDimensions - The image's real size. ML Kit's boxes live in the
 *   input image's space, so this beats inferring a size from where text ends.
 */
export function toOcrResult(raw: MlkitText, knownDimensions?: Dimensions): OcrResult {
  const blocks: OcrBlock[] = raw.blocks.map((block) => ({
    text: block.text,
    lines: block.lines.map((line) => ({
      text: line.text,
      boundingBox: rectToBoundingBox(line.frame),
    })),
    boundingBox: rectToBoundingBox(block.frame),
  }));

  // Rebuild the printed rows from geometry. ML Kit emits one block per column on
  // columnar receipts, so raw block order separates a product from its prices.
  const lines = reconstructRows(blocks);

  let inferredDimensions: Dimensions | undefined;

  if (knownDimensions) {
    inferredDimensions = knownDimensions;
    logger.log('Using known image dimensions:', knownDimensions);
  } else if (raw.blocks.length > 0) {
    let maxX = 0;
    let maxY = 0;
    raw.blocks.forEach((b) => {
      maxX = Math.max(maxX, b.frame.right);
      maxY = Math.max(maxY, b.frame.bottom);
    });
    inferredDimensions = {
      width: Math.ceil(maxX * 1.02),
      height: Math.ceil(maxY * 1.02),
    };
    logger.log('Inferred dimensions from OCR blocks (fallback):', inferredDimensions);
  }

  return { success: true, text: raw.text, blocks, lines, inferredDimensions, raw };
}

/**
 * Detects zones on a photographed capture. They are placed against the
 * geometry the recognizer reported, which is the one its own block coordinates
 * live in; the measured size only stands in when it reported none.
 */
export function detectImageZones(ocr: OcrResult, measured: Dimensions): ImageZones {
  const dimensions = ocr.inferredDimensions || measured;
  const detected = autoDetectZones(ocr.blocks, dimensions);
  return { dimensions, zones: detected.zones, detectedTotal: detected.detectedTotal };
}

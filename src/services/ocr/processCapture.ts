import { Image } from 'react-native';
import { createScopedLogger } from '../../utils/debug';
import { recognizeText, type OcrBlock } from './index';
import { extractTextFromPdf } from '../pdf';
import { autoDetectZones } from './autoZoneDetector';
import type { ZoneDefinition } from '../../types/zones';

const logger = createScopedLogger('ProcessCapture');

interface Dimensions {
  width: number;
  height: number;
}

/** The size assumed for an image whose own size cannot be measured. */
const FALLBACK_DIMENSIONS: Dimensions = { width: 1000, height: 1500 };

export type CaptureProcessError = 'ocr_failed' | 'no_text_content';

export interface CaptureProcessInput {
  uri: string;
  isPdf: boolean;
  /** The size the capture service reported, when it reported one. */
  knownDimensions?: Dimensions;
}

export interface CaptureProcessResult {
  success: boolean;
  isPdf: boolean;
  ocrText: string;
  lines: string[];
  blocks: OcrBlock[];
  /** The space the blocks and zones are positioned in. */
  dimensions: Dimensions;
  zones: ZoneDefinition[];
  detectedTotal: number | null;
  error?: CaptureProcessError;
}

function failure(isPdf: boolean, error: CaptureProcessError): CaptureProcessResult {
  return {
    success: false,
    isPdf,
    ocrText: '',
    lines: [],
    blocks: [],
    dimensions: FALLBACK_DIMENSIONS,
    zones: [],
    detectedTotal: null,
    error,
  };
}

export function measureImage(uri: string): Promise<Dimensions> {
  return new Promise((resolve) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      (error) => {
        logger.log('Could not measure the image, assuming a portrait receipt:', error);
        resolve(FALLBACK_DIMENSIONS);
      }
    );
  });
}

async function processPdf(uri: string): Promise<CaptureProcessResult> {
  const pdf = await extractTextFromPdf(uri);

  if (!pdf.success || pdf.text.length === 0 || !pdf.dimensions) {
    return failure(true, pdf.error === 'no_text_content' ? 'no_text_content' : 'ocr_failed');
  }

  // A PDF carries the geometry of its own text, so it goes through the same
  // zone detection as a photograph rather than a blind second path.
  const detected = autoDetectZones(pdf.blocks, pdf.dimensions);
  logger.log('PDF rows:', pdf.blocks.length, 'zones:', detected.zones.length);

  return {
    success: true,
    isPdf: true,
    ocrText: pdf.text,
    lines: pdf.lines,
    blocks: pdf.blocks,
    dimensions: pdf.dimensions,
    zones: detected.zones,
    detectedTotal: detected.detectedTotal,
  };
}

async function processImage(uri: string, known?: Dimensions): Promise<CaptureProcessResult> {
  const measured = known ?? (await measureImage(uri));
  const result = await recognizeText(uri, measured);

  if (!result.success || result.text.length === 0) {
    return failure(false, 'ocr_failed');
  }

  // Zones are placed against the geometry the recognizer reports, which is the
  // one its own block coordinates live in.
  const dimensions = result.inferredDimensions || measured;
  const detected = autoDetectZones(result.blocks, dimensions);
  logger.log('Blocks:', result.blocks.length, 'zones:', detected.zones.length);

  return {
    success: true,
    isPdf: false,
    ocrText: result.text,
    lines: result.lines,
    blocks: result.blocks,
    dimensions,
    zones: detected.zones,
    detectedTotal: detected.detectedTotal,
  };
}

/**
 * Turns a captured file into everything the review screen needs: its text, the
 * geometry that text was read in, and the zones detected over it.
 */
export async function processCapture(input: CaptureProcessInput): Promise<CaptureProcessResult> {
  const { uri, isPdf, knownDimensions } = input;

  try {
    return isPdf ? await processPdf(uri) : await processImage(uri, knownDimensions);
  } catch (error) {
    logger.error('Processing error:', error);
    return failure(isPdf, 'ocr_failed');
  }
}

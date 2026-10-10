import {
  recognizeText as mlkitRecognizeText,
  type Text as MlkitText,
} from '@infinitered/react-native-mlkit-text-recognition';
import { createScopedLogger } from '../../utils/debug';
import { toOcrResult } from './imageOcr';

const logger = createScopedLogger('OCR');

export interface OcrBlock {
  text: string;
  lines: OcrLine[];
  boundingBox: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
}

export interface OcrLine {
  text: string;
  boundingBox: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
}

export interface OcrResult {
  success: boolean;
  text: string;
  blocks: OcrBlock[];
  lines: string[];
  error?: string;
  /** Inferred image dimensions from OCR block coordinates - use this for zone alignment */
  inferredDimensions?: { width: number; height: number };
  /** ML Kit's untouched result, kept so the reading benchmark can replay it. */
  raw?: MlkitText;
}

/**
 * Performs OCR on an image file.
 * @param imageUri - The URI of the image to process
 * @param knownDimensions - Actual image dimensions from the capture service. When provided,
 *   these are used instead of inferring dimensions from OCR block extents (which is imprecise
 *   because text rarely reaches image edges). ML Kit bounding boxes use the same coordinate
 *   space as the input image, so known dimensions give accurate zone alignment.
 * @returns OCR result with extracted text and structure
 */
export async function recognizeText(
  imageUri: string,
  knownDimensions?: { width: number; height: number }
): Promise<OcrResult> {
  try {
    const raw = await mlkitRecognizeText(imageUri);
    return toOcrResult(raw, knownDimensions);
  } catch (error) {
    logger.error('OCR error:', error);
    return {
      success: false,
      text: '',
      blocks: [],
      lines: [],
      error: error instanceof Error ? error.message : 'Unknown OCR error',
    };
  }
}

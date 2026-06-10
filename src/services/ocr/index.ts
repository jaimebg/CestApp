import { recognizeText as mlkitRecognizeText } from '@infinitered/react-native-mlkit-text-recognition';
import { createScopedLogger } from '../../utils/debug';

const logger = createScopedLogger('OCR');

interface MlkitRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

interface MlkitTextLine {
  text: string;
  frame: MlkitRect;
}

interface MlkitTextBlock {
  text: string;
  frame: MlkitRect;
  lines: MlkitTextLine[];
}

interface MlkitTextResult {
  text: string;
  blocks: MlkitTextBlock[];
}

function rectToBoundingBox(frame: MlkitRect) {
  return {
    left: frame.left,
    top: frame.top,
    width: frame.right - frame.left,
    height: frame.bottom - frame.top,
  };
}

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
    const result: MlkitTextResult = await mlkitRecognizeText(imageUri);

    const blocks: OcrBlock[] = result.blocks.map((block) => ({
      text: block.text,
      lines: block.lines.map((line) => ({
        text: line.text,
        boundingBox: rectToBoundingBox(line.frame),
      })),
      boundingBox: rectToBoundingBox(block.frame),
    }));

    const lines: string[] = [];
    result.blocks.forEach((block) => {
      block.lines.forEach((line) => {
        lines.push(line.text);
      });
    });

    let inferredDimensions: { width: number; height: number } | undefined;

    if (knownDimensions) {
      inferredDimensions = knownDimensions;
      logger.log('Using known image dimensions:', knownDimensions);
    } else if (result.blocks.length > 0) {
      let maxX = 0;
      let maxY = 0;
      result.blocks.forEach((b) => {
        maxX = Math.max(maxX, b.frame.right);
        maxY = Math.max(maxY, b.frame.bottom);
      });
      inferredDimensions = {
        width: Math.ceil(maxX * 1.02),
        height: Math.ceil(maxY * 1.02),
      };
      logger.log('Inferred dimensions from OCR blocks (fallback):', inferredDimensions);
    }

    return {
      success: true,
      text: result.text,
      blocks,
      lines,
      inferredDimensions,
    };
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

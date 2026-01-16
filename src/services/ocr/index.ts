import MlkitOcr, {
  OcrResult as MlkitOcrResult,
  OcrBlock as MlkitOcrBlock,
  OcrLine as MlkitOcrLine,
} from 'rn-mlkit-ocr';

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
}

/**
 * Performs OCR on an image file
 * @param imageUri - The URI of the image to process
 * @returns OCR result with extracted text and structure
 */
export async function recognizeText(imageUri: string): Promise<OcrResult> {
  try {
    const result: MlkitOcrResult = await MlkitOcr.recognizeText(imageUri);

    const blocks: OcrBlock[] = result.blocks.map((block: MlkitOcrBlock) => ({
      text: block.text,
      lines: block.lines.map((line: MlkitOcrLine) => ({
        text: line.text,
        boundingBox: {
          left: line.frame.x,
          top: line.frame.y,
          width: line.frame.width,
          height: line.frame.height,
        },
      })),
      boundingBox: {
        left: block.frame.x,
        top: block.frame.y,
        width: block.frame.width,
        height: block.frame.height,
      },
    }));

    const lines: string[] = [];
    result.blocks.forEach((block: MlkitOcrBlock) => {
      block.lines.forEach((line: MlkitOcrLine) => {
        lines.push(line.text);
      });
    });

    const fullText = result.text;

    return {
      success: true,
      text: fullText,
      blocks,
      lines,
    };
  } catch (error) {
    console.error('OCR error:', error);
    return {
      success: false,
      text: '',
      blocks: [],
      lines: [],
      error: error instanceof Error ? error.message : 'Unknown OCR error',
    };
  }
}

/**
 * Preprocesses OCR text for better parsing
 * - Normalizes whitespace
 * - Removes empty lines
 * - Trims each line
 */
export function preprocessOcrText(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/**
 * Finds lines that likely contain prices
 * Looks for patterns like $X.XX, X.XX, etc.
 */
export function findPriceLines(lines: string[]): string[] {
  const pricePattern = /\$?\d+[.,]\d{2}/;
  return lines.filter((line) => pricePattern.test(line));
}

/**
 * Extracts potential total amount from OCR text
 * Looks for keywords like "TOTAL", "SUBTOTAL", "TAX"
 */
export function findTotalLine(lines: string[]): string | null {
  const totalKeywords = ['total', 'subtotal', 'sub-total', 'grand total', 'amount due'];

  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    for (const keyword of totalKeywords) {
      if (lowerLine.includes(keyword)) {
        return line;
      }
    }
  }

  return null;
}

/**
 * Extracts potential date from OCR text
 * Looks for common date patterns
 */
export function findDateLine(lines: string[]): string | null {
  const datePatterns = [
    /\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/,
    /\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}/,
    /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{1,2}/i,
  ];

  for (const line of lines) {
    for (const pattern of datePatterns) {
      if (pattern.test(line)) {
        return line;
      }
    }
  }

  return null;
}

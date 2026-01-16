import { readAsStringAsync } from 'expo-file-system/legacy';

export interface PdfExtractionResult {
  success: boolean;
  text: string;
  lines: string[];
  pageCount: number;
  error?: string;
}

/**
 * Simple PDF text extractor for React Native.
 * Works with digital PDFs that have embedded text (e.g., email receipts, online invoices).
 * Scanned PDFs (images saved as PDF) will not have extractable text.
 */
export async function extractTextFromPdf(uri: string): Promise<PdfExtractionResult> {
  try {
    // Read the PDF file as base64
    const base64 = await readAsStringAsync(uri, {
      encoding: 'base64',
    });

    // Convert base64 to string
    const pdfContent = atob(base64);

    // Extract text from PDF content streams
    const extractedText = extractTextFromPdfContent(pdfContent);
    const lines = extractedText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    // Count pages (rough estimate based on /Page objects)
    const pageMatches = pdfContent.match(/\/Type\s*\/Page[^s]/g);
    const pageCount = pageMatches ? pageMatches.length : 1;

    if (lines.length === 0) {
      return {
        success: false,
        text: '',
        lines: [],
        pageCount,
        error: 'no_text_content',
      };
    }

    return {
      success: true,
      text: lines.join('\n'),
      lines,
      pageCount,
    };
  } catch (error) {
    console.error('PDF extraction error:', error);
    return {
      success: false,
      text: '',
      lines: [],
      pageCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Extract text from PDF content by parsing text streams.
 */
function extractTextFromPdfContent(content: string): string {
  const textParts: string[] = [];

  // Find all text streams between BT (begin text) and ET (end text)
  const textBlockRegex = /BT([\s\S]*?)ET/g;
  let match;

  while ((match = textBlockRegex.exec(content)) !== null) {
    const textBlock = match[1];

    // Extract text from Tj and TJ operators
    // Tj: (text) Tj - show text string
    // TJ: [(text) num (text) ...] TJ - show text with positioning
    const tjMatches = textBlock.match(/\(([^)]*)\)\s*Tj/g);
    const tjArrayMatches = textBlock.match(/\[(.*?)\]\s*TJ/g);

    if (tjMatches) {
      for (const tj of tjMatches) {
        const textMatch = tj.match(/\(([^)]*)\)/);
        if (textMatch) {
          textParts.push(decodeText(textMatch[1]));
        }
      }
    }

    if (tjArrayMatches) {
      for (const tjArray of tjArrayMatches) {
        // Extract all text strings from the array
        const strings = tjArray.match(/\(([^)]*)\)/g);
        if (strings) {
          const lineText = strings
            .map((s) => {
              const textMatch = s.match(/\(([^)]*)\)/);
              return textMatch ? decodeText(textMatch[1]) : '';
            })
            .join('');
          textParts.push(lineText);
        }
      }
    }
  }

  // Also try to find plain text in streams
  const streamRegex = /stream([\s\S]*?)endstream/g;
  while ((match = streamRegex.exec(content)) !== null) {
    const streamContent = match[1];

    // Look for readable text patterns
    const readableText = streamContent.match(/\(([A-Za-z0-9\s.,\-$%@#!?:;'"]+)\)/g);
    if (readableText) {
      for (const text of readableText) {
        const textMatch = text.match(/\(([^)]+)\)/);
        if (textMatch && textMatch[1].length > 2) {
          const decoded = decodeText(textMatch[1]);
          if (isReadableText(decoded)) {
            textParts.push(decoded);
          }
        }
      }
    }
  }

  return textParts.join('\n');
}

/**
 * Decode PDF text escapes.
 */
function decodeText(text: string): string {
  return text
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\')
    .replace(/\\([0-7]{1,3})/g, (_, octal) => {
      return String.fromCharCode(parseInt(octal, 8));
    });
}

/**
 * Check if text is readable (not binary garbage).
 */
function isReadableText(text: string): boolean {
  // Check if at least 70% of characters are printable ASCII or common unicode
  const printableCount = text.split('').filter((char) => {
    const code = char.charCodeAt(0);
    return (
      (code >= 32 && code <= 126) || // Printable ASCII
      (code >= 160 && code <= 255) || // Extended ASCII
      (code >= 0x00c0 && code <= 0x024f) // Latin Extended
    );
  }).length;

  return printableCount / text.length >= 0.7;
}

/**
 * Check if a PDF has extractable text content.
 */
export async function hasPdfText(uri: string): Promise<boolean> {
  const result = await extractTextFromPdf(uri);
  return result.success && result.text.length > 0;
}

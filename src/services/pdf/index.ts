import { readAsStringAsync } from 'expo-file-system/legacy';
import pako from 'pako';

declare const __DEV__: boolean;

export interface PdfExtractionResult {
  success: boolean;
  text: string;
  lines: string[];
  pageCount: number;
  error?: string;
}

/**
 * PDF text extractor for React Native.
 * Works with digital PDFs that have embedded text (e.g., email receipts, online invoices).
 * Handles both compressed (FlateDecode) and uncompressed streams.
 */
export async function extractTextFromPdf(uri: string): Promise<PdfExtractionResult> {
  try {
    // Read the PDF file as base64
    const base64 = await readAsStringAsync(uri, {
      encoding: 'base64',
    });

    // Convert base64 to Uint8Array
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Extract text from PDF
    const extractedText = extractTextFromPdfBytes(bytes);
    const lines = extractedText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    // Count pages
    const pdfString = binaryString;
    const pageMatches = pdfString.match(/\/Type\s*\/Page[^s]/g);
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
 * Extract text from PDF bytes.
 */
function extractTextFromPdfBytes(bytes: Uint8Array): string {
  const pdfString = new TextDecoder('latin1').decode(bytes);
  const textParts: string[] = [];
  let streamCount = 0;
  let decompressedCount = 0;
  let textFoundCount = 0;

  // Find all streams and try to extract text
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match;

  while ((match = streamRegex.exec(pdfString)) !== null) {
    streamCount++;
    const streamStart = match.index + match[0].indexOf('stream') + 6;

    // Find the object that contains this stream to check for filters
    const objStart = pdfString.lastIndexOf('obj', match.index);
    const objHeader = pdfString.substring(objStart, match.index);

    // Check if stream is compressed with FlateDecode (including shorthand /Fl)
    const isFlateCompressed =
      /\/Filter\s*\/FlateDecode/.test(objHeader) ||
      /\/Filter\s*\[\s*\/FlateDecode\s*\]/.test(objHeader) ||
      /\/Filter\s*\/Fl\b/.test(objHeader) ||
      /\/Filter\s*\[\s*\/Fl\s*\]/.test(objHeader);

    // Get stream content
    let streamContent = match[1];

    if (isFlateCompressed) {
      // Try to decompress
      try {
        // Find the actual stream bytes
        const streamStartInBytes = findStreamStart(bytes, match.index);
        const streamEndInBytes = findStreamEnd(bytes, streamStartInBytes);

        if (streamStartInBytes !== -1 && streamEndInBytes !== -1) {
          const compressedData = bytes.slice(streamStartInBytes, streamEndInBytes);

          let decompressed: Uint8Array;
          try {
            // Try standard zlib inflate first
            decompressed = pako.inflate(compressedData);
          } catch {
            // If that fails, try raw deflate (no zlib header)
            try {
              decompressed = pako.inflateRaw(compressedData);
            } catch {
              // Both failed, skip this stream
              continue;
            }
          }

          streamContent = new TextDecoder('latin1').decode(decompressed);
          decompressedCount++;
        }
      } catch (e) {
        // Decompression failed, skip this stream
        continue;
      }
    }

    // Extract text from the stream content
    const text = extractTextFromStream(streamContent);
    if (text) {
      textParts.push(text);
      textFoundCount++;
    }
  }

  // Debug logging for troubleshooting
  if (__DEV__) {
    console.log(`[PDF] Streams: ${streamCount}, Decompressed: ${decompressedCount}, With text: ${textFoundCount}`);
  }

  return textParts.join('\n');
}

/**
 * Find the start of stream content in bytes (after 'stream\n' or 'stream\r\n').
 */
function findStreamStart(bytes: Uint8Array, approxIndex: number): number {
  // Search for 'stream' followed by newline
  const searchStart = Math.max(0, approxIndex - 50);
  const searchEnd = Math.min(bytes.length, approxIndex + 200);

  for (let i = searchStart; i < searchEnd - 7; i++) {
    if (bytes[i] === 115 && bytes[i+1] === 116 && bytes[i+2] === 114 &&
        bytes[i+3] === 101 && bytes[i+4] === 97 && bytes[i+5] === 109) { // 'stream'
      // Skip past newline(s)
      let pos = i + 6;
      if (bytes[pos] === 13) pos++; // CR
      if (bytes[pos] === 10) pos++; // LF
      return pos;
    }
  }
  return -1;
}

/**
 * Find the end of stream content (before 'endstream').
 */
function findStreamEnd(bytes: Uint8Array, startIndex: number): number {
  // Search for 'endstream'
  for (let i = startIndex; i < bytes.length - 9; i++) {
    if (bytes[i] === 101 && bytes[i+1] === 110 && bytes[i+2] === 100 &&
        bytes[i+3] === 115 && bytes[i+4] === 116 && bytes[i+5] === 114 &&
        bytes[i+6] === 101 && bytes[i+7] === 97 && bytes[i+8] === 109) { // 'endstream'
      // Go back past any newlines
      let pos = i;
      if (pos > 0 && bytes[pos-1] === 10) pos--; // LF
      if (pos > 0 && bytes[pos-1] === 13) pos--; // CR
      return pos;
    }
  }
  return -1;
}

/**
 * Extract text from a PDF stream content.
 */
function extractTextFromStream(content: string): string {
  const textParts: string[] = [];

  // Find all text blocks between BT and ET
  const textBlockRegex = /BT([\s\S]*?)ET/g;
  let match;

  while ((match = textBlockRegex.exec(content)) !== null) {
    const textBlock = match[1];
    const blockText = extractTextFromTextBlock(textBlock);
    if (blockText) {
      textParts.push(blockText);
    }
  }

  return textParts.join('\n');
}

/**
 * Extract text from a BT...ET text block.
 */
function extractTextFromTextBlock(block: string): string {
  const parts: string[] = [];

  // Match Tj operator: (text) Tj
  const tjRegex = /\(([^)]*)\)\s*Tj/g;
  let match;
  while ((match = tjRegex.exec(block)) !== null) {
    const decoded = decodePdfString(match[1]);
    if (decoded) parts.push(decoded);
  }

  // Match TJ operator: [(text) num (text) ...] TJ - handles both string and hex
  const tjArrayRegex = /\[((?:[^[\]]*|\[[^\]]*\])*)\]\s*TJ/gi;
  while ((match = tjArrayRegex.exec(block)) !== null) {
    const arrayContent = match[1];
    const lineParts: string[] = [];

    // Extract both parenthesized strings and hex strings from the array
    const elementRegex = /\(([^)]*)\)|<([0-9A-Fa-f]+)>/g;
    let elemMatch;
    while ((elemMatch = elementRegex.exec(arrayContent)) !== null) {
      if (elemMatch[1] !== undefined) {
        // Parenthesized string
        const decoded = decodePdfString(elemMatch[1]);
        if (decoded) lineParts.push(decoded);
      } else if (elemMatch[2] !== undefined) {
        // Hex string
        const decoded = decodeHexString(elemMatch[2]);
        if (decoded) lineParts.push(decoded);
      }
    }
    if (lineParts.length > 0) {
      parts.push(lineParts.join(''));
    }
  }

  // Match standalone hex strings: <hexdata> Tj
  const hexTjRegex = /<([0-9A-Fa-f]+)>\s*Tj/g;
  while ((match = hexTjRegex.exec(block)) !== null) {
    const decoded = decodeHexString(match[1]);
    if (decoded) parts.push(decoded);
  }

  return parts.join(' ');
}

/**
 * Decode a PDF string with escape sequences.
 */
function decodePdfString(str: string): string {
  if (!str) return '';

  let result = str
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\');

  // Handle octal escapes
  result = result.replace(/\\([0-7]{1,3})/g, (_, octal) => {
    return String.fromCharCode(parseInt(octal, 8));
  });

  return result;
}

/**
 * Decode a hex string (supports both single-byte and UTF-16BE encoding).
 */
function decodeHexString(hex: string): string {
  if (!hex) return '';

  // Pad to even length if needed
  if (hex.length % 2 !== 0) {
    hex = hex + '0';
  }

  // Check if this looks like UTF-16BE (common in PDFs)
  // UTF-16BE hex strings typically have pairs like "0041" for 'A'
  if (hex.length >= 4 && hex.length % 4 === 0) {
    // Try UTF-16BE decoding
    let utf16Result = '';
    let isValidUtf16 = true;

    for (let i = 0; i < hex.length; i += 4) {
      const highByte = parseInt(hex.substr(i, 2), 16);
      const lowByte = parseInt(hex.substr(i + 2, 2), 16);
      const charCode = (highByte << 8) | lowByte;

      // Check if it's a reasonable character
      if (charCode === 0 || (charCode > 0 && charCode < 32 && charCode !== 9 && charCode !== 10 && charCode !== 13)) {
        isValidUtf16 = false;
        break;
      }

      if (charCode >= 32 || charCode === 9 || charCode === 10 || charCode === 13) {
        utf16Result += String.fromCharCode(charCode);
      }
    }

    if (isValidUtf16 && utf16Result.length > 0) {
      return utf16Result;
    }
  }

  // Fall back to single-byte decoding
  let result = '';
  for (let i = 0; i < hex.length; i += 2) {
    const charCode = parseInt(hex.substr(i, 2), 16);
    // Include printable ASCII and common extended chars
    if (charCode >= 32 && charCode <= 255) {
      result += String.fromCharCode(charCode);
    } else if (charCode === 9 || charCode === 10 || charCode === 13) {
      // Tab, LF, CR
      result += String.fromCharCode(charCode);
    }
  }
  return result;
}

/**
 * Check if a PDF has extractable text content.
 */
export async function hasPdfText(uri: string): Promise<boolean> {
  const result = await extractTextFromPdf(uri);
  return result.success && result.text.length > 0;
}

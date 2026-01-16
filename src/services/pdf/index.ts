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
 * Convert bytes to string (latin1/iso-8859-1 encoding).
 * TextDecoder doesn't support latin1 in Hermes, so we do it manually.
 */
function bytesToString(bytes: Uint8Array): string {
  let result = '';
  for (let i = 0; i < bytes.length; i++) {
    result += String.fromCharCode(bytes[i]);
  }
  return result;
}

// Type for Unicode character mappings from ToUnicode CMaps
type UnicodeMap = Map<number, string>;

/**
 * Extract text from PDF bytes.
 */
function extractTextFromPdfBytes(bytes: Uint8Array): string {
  const pdfString = bytesToString(bytes);
  const textParts: string[] = [];
  let streamCount = 0;
  let decompressedCount = 0;
  let textFoundCount = 0;

  // First, extract all ToUnicode CMaps from the PDF
  const unicodeMaps = extractToUnicodeMaps(pdfString, bytes);
  if (__DEV__ && unicodeMaps.size > 0) {
    console.log(`[PDF] Found ${unicodeMaps.size} ToUnicode CMaps`);
  }

  // Build a combined unicode map from all CMaps
  const combinedMap: UnicodeMap = new Map();
  unicodeMaps.forEach((map) => {
    map.forEach((value, key) => combinedMap.set(key, value));
  });

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

          streamContent = bytesToString(decompressed);
          decompressedCount++;
        }
      } catch (e) {
        // Decompression failed, skip this stream
        continue;
      }
    }

    // Extract text from the stream content
    const text = extractTextFromStream(streamContent, combinedMap);
    if (text) {
      textParts.push(text);
      textFoundCount++;
      // Log first extracted text for debugging
      if (__DEV__ && textFoundCount === 1) {
        console.log(`[PDF] First text sample (100 chars): ${text.substring(0, 100)}`);
      }
    }
  }

  // Debug logging for troubleshooting
  if (__DEV__) {
    console.log(`[PDF] Streams: ${streamCount}, Decompressed: ${decompressedCount}, With text: ${textFoundCount}`);
    if (textParts.length > 0) {
      console.log(`[PDF] Total extracted text length: ${textParts.join('\n').length}`);
    }
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
 * Extract ToUnicode CMaps from the PDF.
 */
function extractToUnicodeMaps(pdfString: string, bytes: Uint8Array): Map<string, UnicodeMap> {
  const maps = new Map<string, UnicodeMap>();

  // Find all ToUnicode references and their streams
  const toUnicodeRegex = /(\d+)\s+\d+\s+obj[\s\S]*?\/ToUnicode\s+(\d+)\s+\d+\s+R/g;
  let refMatch;

  const streamObjIds = new Set<string>();
  while ((refMatch = toUnicodeRegex.exec(pdfString)) !== null) {
    streamObjIds.add(refMatch[2]);
  }

  // Also find direct ToUnicode streams
  const directToUnicodeRegex = /\/ToUnicode\s+(\d+)\s+\d+\s+R/g;
  while ((refMatch = directToUnicodeRegex.exec(pdfString)) !== null) {
    streamObjIds.add(refMatch[1]);
  }

  // For each referenced object, find and parse its stream
  streamObjIds.forEach((objId) => {
    const objRegex = new RegExp(`${objId}\\s+\\d+\\s+obj[\\s\\S]*?stream\\r?\\n([\\s\\S]*?)\\r?\\nendstream`, 'g');
    const objMatch = objRegex.exec(pdfString);

    if (objMatch) {
      let cmapContent = objMatch[1];

      // Check if compressed
      const objHeaderRegex = new RegExp(`${objId}\\s+\\d+\\s+obj([\\s\\S]*?)stream`);
      const headerMatch = objHeaderRegex.exec(pdfString);

      if (headerMatch && /\/Filter\s*\/FlateDecode/.test(headerMatch[1])) {
        // Need to decompress
        const streamStart = findStreamStartForObj(pdfString, bytes, objId);
        if (streamStart !== -1) {
          const streamEnd = findStreamEnd(bytes, streamStart);
          if (streamEnd !== -1) {
            try {
              const compressed = bytes.slice(streamStart, streamEnd);
              const decompressed = pako.inflate(compressed);
              cmapContent = bytesToString(decompressed);
            } catch {
              try {
                const compressed = bytes.slice(streamStart, streamEnd);
                const decompressed = pako.inflateRaw(compressed);
                cmapContent = bytesToString(decompressed);
              } catch {
                return;
              }
            }
          }
        }
      }

      // Parse the CMap
      const unicodeMap = parseToUnicodeCMap(cmapContent);
      if (unicodeMap.size > 0) {
        maps.set(objId, unicodeMap);
      }
    }
  });

  return maps;
}

/**
 * Find stream start for a specific object ID.
 */
function findStreamStartForObj(pdfString: string, bytes: Uint8Array, objId: string): number {
  const objRegex = new RegExp(`${objId}\\s+\\d+\\s+obj`);
  const match = objRegex.exec(pdfString);
  if (match) {
    return findStreamStart(bytes, match.index);
  }
  return -1;
}

/**
 * Parse a ToUnicode CMap and return a mapping of character codes to Unicode strings.
 */
function parseToUnicodeCMap(cmapContent: string): UnicodeMap {
  const map: UnicodeMap = new Map();

  // Parse beginbfchar...endbfchar sections
  // Format: <srcCode> <dstString>
  const bfcharRegex = /beginbfchar([\s\S]*?)endbfchar/g;
  let bfcharMatch;

  while ((bfcharMatch = bfcharRegex.exec(cmapContent)) !== null) {
    const section = bfcharMatch[1];
    const lineRegex = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g;
    let lineMatch;

    while ((lineMatch = lineRegex.exec(section)) !== null) {
      const srcCode = parseInt(lineMatch[1], 16);
      const dstHex = lineMatch[2];
      const dstString = hexToUnicodeString(dstHex);
      map.set(srcCode, dstString);
    }
  }

  // Parse beginbfrange...endbfrange sections
  // Format: <srcCodeLo> <srcCodeHi> <dstStringLo>
  // or: <srcCodeLo> <srcCodeHi> [<dstString1> <dstString2> ...]
  const bfrangeRegex = /beginbfrange([\s\S]*?)endbfrange/g;
  let bfrangeMatch;

  while ((bfrangeMatch = bfrangeRegex.exec(cmapContent)) !== null) {
    const section = bfrangeMatch[1];

    // Match range with single destination
    const rangeRegex = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g;
    let rangeMatch;

    while ((rangeMatch = rangeRegex.exec(section)) !== null) {
      const srcLo = parseInt(rangeMatch[1], 16);
      const srcHi = parseInt(rangeMatch[2], 16);
      let dstCode = parseInt(rangeMatch[3], 16);

      for (let code = srcLo; code <= srcHi; code++) {
        map.set(code, String.fromCharCode(dstCode));
        dstCode++;
      }
    }

    // Match range with array of destinations
    const arrayRangeRegex = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*\[([\s\S]*?)\]/g;
    let arrayMatch;

    while ((arrayMatch = arrayRangeRegex.exec(section)) !== null) {
      const srcLo = parseInt(arrayMatch[1], 16);
      const srcHi = parseInt(arrayMatch[2], 16);
      const destArray = arrayMatch[3];

      const destRegex = /<([0-9A-Fa-f]+)>/g;
      let destMatch;
      let code = srcLo;

      while ((destMatch = destRegex.exec(destArray)) !== null && code <= srcHi) {
        const dstString = hexToUnicodeString(destMatch[1]);
        map.set(code, dstString);
        code++;
      }
    }
  }

  return map;
}

/**
 * Convert a hex string to a Unicode string (UTF-16BE).
 */
function hexToUnicodeString(hex: string): string {
  let result = '';
  // UTF-16BE: 2 bytes per character
  for (let i = 0; i < hex.length; i += 4) {
    if (i + 4 <= hex.length) {
      const charCode = parseInt(hex.substr(i, 4), 16);
      result += String.fromCharCode(charCode);
    } else if (i + 2 <= hex.length) {
      // Single byte fallback
      const charCode = parseInt(hex.substr(i, 2), 16);
      result += String.fromCharCode(charCode);
    }
  }
  return result;
}

/**
 * Extract text from a PDF stream content.
 */
function extractTextFromStream(content: string, unicodeMap: UnicodeMap): string {
  const textParts: string[] = [];

  // Find all text blocks between BT and ET
  const textBlockRegex = /BT([\s\S]*?)ET/g;
  let match;

  while ((match = textBlockRegex.exec(content)) !== null) {
    const textBlock = match[1];
    const blockText = extractTextFromTextBlock(textBlock, unicodeMap);
    if (blockText) {
      textParts.push(blockText);
    }
  }

  return textParts.join('\n');
}

/**
 * Extract text from a BT...ET text block.
 */
function extractTextFromTextBlock(block: string, unicodeMap: UnicodeMap): string {
  const parts: string[] = [];

  // Match Tj operator: (text) Tj
  const tjRegex = /\(([^)]*)\)\s*Tj/g;
  let match;
  while ((match = tjRegex.exec(block)) !== null) {
    const decoded = decodePdfString(match[1], unicodeMap);
    if (decoded) parts.push(decoded);
  }

  // Match TJ operator: [(text) num (text) ...] TJ - handles both string and hex
  // The numbers represent kerning - large negative values indicate word spacing
  const tjArrayRegex = /\[((?:[^[\]]*|\[[^\]]*\])*)\]\s*TJ/gi;
  while ((match = tjArrayRegex.exec(block)) !== null) {
    const arrayContent = match[1];
    let lineText = '';

    // Parse TJ array elements: strings, hex strings, and numbers
    // Numbers < -100 typically indicate word spacing
    const elementRegex = /\(([^)]*)\)|<([0-9A-Fa-f]+)>|(-?\d+\.?\d*)/g;
    let elemMatch;
    let lastWasSpace = false;

    while ((elemMatch = elementRegex.exec(arrayContent)) !== null) {
      if (elemMatch[1] !== undefined) {
        // Parenthesized string
        const decoded = decodePdfString(elemMatch[1], unicodeMap);
        if (decoded) {
          lineText += decoded;
          lastWasSpace = false;
        }
      } else if (elemMatch[2] !== undefined) {
        // Hex string
        const decoded = decodeHexStringWithMap(elemMatch[2], unicodeMap);
        if (decoded) {
          lineText += decoded;
          lastWasSpace = false;
        }
      } else if (elemMatch[3] !== undefined) {
        // Kerning number - large negative values indicate word spacing
        const kerning = parseFloat(elemMatch[3]);
        // Threshold: if kerning is less than -100, it's likely a word space
        if (kerning < -100 && !lastWasSpace && lineText.length > 0) {
          lineText += ' ';
          lastWasSpace = true;
        }
      }
    }

    if (lineText.length > 0) {
      parts.push(lineText);
    }
  }

  // Match standalone hex strings: <hexdata> Tj
  const hexTjRegex = /<([0-9A-Fa-f]+)>\s*Tj/g;
  while ((match = hexTjRegex.exec(block)) !== null) {
    const decoded = decodeHexStringWithMap(match[1], unicodeMap);
    if (decoded) parts.push(decoded);
  }

  // Join without spaces - the text itself contains spaces where needed
  // PDFs often have separate Tj/TJ calls for each character with kerning
  return parts.join('');
}

/**
 * Decode a PDF string with escape sequences, applying unicode map if available.
 */
function decodePdfString(str: string, unicodeMap: UnicodeMap): string {
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

  // If we have a unicode map, try to apply it character by character
  if (unicodeMap.size > 0) {
    let mapped = '';
    for (let i = 0; i < result.length; i++) {
      const charCode = result.charCodeAt(i);
      const mappedChar = unicodeMap.get(charCode);
      mapped += mappedChar !== undefined ? mappedChar : result[i];
    }
    return mapped;
  }

  return result;
}

/**
 * Decode a hex string using the unicode map if available.
 */
function decodeHexStringWithMap(hex: string, unicodeMap: UnicodeMap): string {
  if (!hex) return '';

  // Pad to even length if needed
  if (hex.length % 2 !== 0) {
    hex = hex + '0';
  }

  // If we have a unicode map, use it
  if (unicodeMap.size > 0) {
    let result = '';

    // Try 2-byte codes first (common for CID fonts)
    if (hex.length % 4 === 0) {
      for (let i = 0; i < hex.length; i += 4) {
        const code = parseInt(hex.substr(i, 4), 16);
        const mapped = unicodeMap.get(code);
        if (mapped !== undefined) {
          result += mapped;
        } else {
          // Fallback to direct character if not in map
          if (code >= 32 && code < 65535) {
            result += String.fromCharCode(code);
          }
        }
      }
      if (result.length > 0) {
        return result;
      }
    }

    // Try 1-byte codes
    for (let i = 0; i < hex.length; i += 2) {
      const code = parseInt(hex.substr(i, 2), 16);
      const mapped = unicodeMap.get(code);
      if (mapped !== undefined) {
        result += mapped;
      } else if (code >= 32 && code <= 126) {
        result += String.fromCharCode(code);
      }
    }

    if (result.length > 0) {
      return result;
    }
  }

  // Fall back to the original hex string decoding
  return decodeHexString(hex);
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

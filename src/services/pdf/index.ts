import { readAsStringAsync } from 'expo-file-system/legacy';
import { inflate, inflateRaw } from 'pako';
import { createScopedLogger } from '../../utils/debug';

const logger = createScopedLogger('PDF');

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
    const base64 = await readAsStringAsync(uri, {
      encoding: 'base64',
    });

    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const extractedText = extractTextFromPdfBytes(bytes);

    const cleanedText = extractedText
      .replace(/\x00/g, '')
      .replace(/[ \t]+/g, ' ')
      .replace(/ ?\n ?/g, '\n');

    const lines = cleanedText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

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
    logger.error('PDF extraction error:', error);
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

type UnicodeMap = Map<number, string>;

/**
 * A run of text together with the position it is painted at, in PDF user space
 * (origin bottom-left, y grows upwards).
 */
interface PositionedRun {
  text: string;
  x: number;
  y: number;
  fontSize: number;
}

/**
 * Extract text from PDF bytes.
 */
function extractTextFromPdfBytes(bytes: Uint8Array): string {
  const pdfString = bytesToString(bytes);
  const textParts: string[] = [];

  const unicodeMaps = extractToUnicodeMaps(pdfString, bytes);

  const combinedMap: UnicodeMap = new Map();
  unicodeMaps.forEach((map) => {
    map.forEach((value, key) => combinedMap.set(key, value));
  });

  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match;

  while ((match = streamRegex.exec(pdfString)) !== null) {
    const objStart = pdfString.lastIndexOf('obj', match.index);
    const objHeader = pdfString.substring(objStart, match.index);

    const isFlateCompressed =
      /\/Filter\s*\/FlateDecode/.test(objHeader) ||
      /\/Filter\s*\[\s*\/FlateDecode\s*\]/.test(objHeader) ||
      /\/Filter\s*\/Fl\b/.test(objHeader) ||
      /\/Filter\s*\[\s*\/Fl\s*\]/.test(objHeader);

    let streamContent = match[1];

    if (isFlateCompressed) {
      try {
        const streamStartInBytes = findStreamStart(bytes, match.index);
        const streamEndInBytes = findStreamEnd(bytes, streamStartInBytes);

        if (streamStartInBytes !== -1 && streamEndInBytes !== -1) {
          const compressedData = bytes.slice(streamStartInBytes, streamEndInBytes);

          let decompressed: Uint8Array;
          try {
            decompressed = inflate(compressedData);
          } catch {
            try {
              decompressed = inflateRaw(compressedData);
            } catch {
              continue;
            }
          }

          streamContent = bytesToString(decompressed);
        }
      } catch {
        continue;
      }
    }

    const text = extractTextFromStream(streamContent, combinedMap);
    if (text) {
      textParts.push(text);
    }
  }

  return textParts.join('\n');
}

/**
 * Content stream operators that matter for laying text out.
 *
 * Ordered so that string operands are consumed before the numeric operators,
 * which keeps digits inside a literal string from being read as coordinates.
 */
const TEXT_OPERATOR_REGEX = new RegExp(
  [
    String.raw`(\[(?:[^\[\]\\]|\\[\s\S])*\])\s*TJ`,
    String.raw`(\((?:[^()\\]|\\[\s\S])*\)|<[0-9A-Fa-f\s]*>)\s*(Tj|'|")`,
    String.raw`(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+Tm`,
    String.raw`(-?[\d.]+)\s+(-?[\d.]+)\s+(TD|Td)`,
    String.raw`(-?[\d.]+)\s+TL`,
    String.raw`\/[^\s\/\[\]<>()]+\s+(-?[\d.]+)\s+Tf`,
    String.raw`(T\*)`,
  ].join('|'),
  'g'
);

const DEFAULT_FONT_SIZE = 10;

/**
 * Fraction of the font size within which two runs are treated as sharing a
 * baseline. Cells of one table row are emitted with an identical y, so this
 * only has to absorb rounding and the odd superscript.
 */
const ROW_TOLERANCE_RATIO = 0.3;

/**
 * Find the start of stream content in bytes (after 'stream\n' or 'stream\r\n').
 */
function findStreamStart(bytes: Uint8Array, approxIndex: number): number {
  const searchStart = Math.max(0, approxIndex - 50);
  const searchEnd = Math.min(bytes.length, approxIndex + 200);

  for (let i = searchStart; i < searchEnd - 7; i++) {
    if (
      bytes[i] === 115 &&
      bytes[i + 1] === 116 &&
      bytes[i + 2] === 114 &&
      bytes[i + 3] === 101 &&
      bytes[i + 4] === 97 &&
      bytes[i + 5] === 109
    ) {
      let pos = i + 6;
      if (bytes[pos] === 13) pos++;
      if (bytes[pos] === 10) pos++;
      return pos;
    }
  }
  return -1;
}

/**
 * Find the end of stream content (before 'endstream').
 */
function findStreamEnd(bytes: Uint8Array, startIndex: number): number {
  for (let i = startIndex; i < bytes.length - 9; i++) {
    if (
      bytes[i] === 101 &&
      bytes[i + 1] === 110 &&
      bytes[i + 2] === 100 &&
      bytes[i + 3] === 115 &&
      bytes[i + 4] === 116 &&
      bytes[i + 5] === 114 &&
      bytes[i + 6] === 101 &&
      bytes[i + 7] === 97 &&
      bytes[i + 8] === 109
    ) {
      let pos = i;
      if (pos > 0 && bytes[pos - 1] === 10) pos--;
      if (pos > 0 && bytes[pos - 1] === 13) pos--;
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

  const toUnicodeRegex = /(\d+)\s+\d+\s+obj[\s\S]*?\/ToUnicode\s+(\d+)\s+\d+\s+R/g;
  let refMatch;

  const streamObjIds = new Set<string>();
  while ((refMatch = toUnicodeRegex.exec(pdfString)) !== null) {
    streamObjIds.add(refMatch[2]);
  }

  const directToUnicodeRegex = /\/ToUnicode\s+(\d+)\s+\d+\s+R/g;
  while ((refMatch = directToUnicodeRegex.exec(pdfString)) !== null) {
    streamObjIds.add(refMatch[1]);
  }

  streamObjIds.forEach((objId) => {
    const objRegex = new RegExp(
      `${objId}\\s+\\d+\\s+obj[\\s\\S]*?stream\\r?\\n([\\s\\S]*?)\\r?\\nendstream`,
      'g'
    );
    const objMatch = objRegex.exec(pdfString);

    if (objMatch) {
      let cmapContent = objMatch[1];

      const objHeaderRegex = new RegExp(`${objId}\\s+\\d+\\s+obj([\\s\\S]*?)stream`);
      const headerMatch = objHeaderRegex.exec(pdfString);

      if (headerMatch && /\/Filter\s*\/FlateDecode/.test(headerMatch[1])) {
        const streamStart = findStreamStartForObj(pdfString, bytes, objId);
        if (streamStart !== -1) {
          const streamEnd = findStreamEnd(bytes, streamStart);
          if (streamEnd !== -1) {
            try {
              const compressed = bytes.slice(streamStart, streamEnd);
              const decompressed = inflate(compressed);
              cmapContent = bytesToString(decompressed);
            } catch {
              try {
                const compressed = bytes.slice(streamStart, streamEnd);
                const decompressed = inflateRaw(compressed);
                cmapContent = bytesToString(decompressed);
              } catch {
                return;
              }
            }
          }
        }
      }

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

  const bfrangeRegex = /beginbfrange([\s\S]*?)endbfrange/g;
  let bfrangeMatch;

  while ((bfrangeMatch = bfrangeRegex.exec(cmapContent)) !== null) {
    const section = bfrangeMatch[1];

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
  for (let i = 0; i < hex.length; i += 4) {
    if (i + 4 <= hex.length) {
      const charCode = parseInt(hex.substr(i, 4), 16);
      result += String.fromCharCode(charCode);
    } else if (i + 2 <= hex.length) {
      const charCode = parseInt(hex.substr(i, 2), 16);
      result += String.fromCharCode(charCode);
    }
  }
  return result;
}

/**
 * Extract text from a PDF stream content.
 *
 * Receipt PDFs paint each cell of the item table as its own positioned text
 * run, so reading the runs in stream order yields one field per line and the
 * quantity/name/price association is lost. Collecting the runs with their
 * coordinates and regrouping them by baseline restores the rows a human sees:
 *   "1" + "HELADOS NARANJA" + "2,40" -> "1 HELADOS NARANJA 2,40"
 */
function extractTextFromStream(content: string, unicodeMap: UnicodeMap): string {
  const runs: PositionedRun[] = [];

  const textBlockRegex = /BT([\s\S]*?)ET/g;
  let match;

  while ((match = textBlockRegex.exec(content)) !== null) {
    collectRunsFromTextBlock(match[1], unicodeMap, runs);
  }

  return groupRunsIntoLines(runs).join('\n');
}

/**
 * Walk a BT...ET block, tracking the text position operators, and emit one run
 * per position. Text shown without an intervening move stays in the same run,
 * so glyphs a font kerns apart never gain a stray space.
 */
function collectRunsFromTextBlock(
  block: string,
  unicodeMap: UnicodeMap,
  runs: PositionedRun[]
): void {
  let lineX = 0;
  let lineY = 0;
  let leading = 0;
  let fontSize = DEFAULT_FONT_SIZE;
  let pending = '';

  const flush = () => {
    if (pending.length > 0) {
      runs.push({ text: pending, x: lineX, y: lineY, fontSize });
      pending = '';
    }
  };

  TEXT_OPERATOR_REGEX.lastIndex = 0;
  let match;

  while ((match = TEXT_OPERATOR_REGEX.exec(block)) !== null) {
    if (match[1] !== undefined) {
      pending += decodeTjArray(match[1], unicodeMap);
    } else if (match[2] !== undefined) {
      // ' and " move to the next line before showing their string
      if (match[3] === "'" || match[3] === '"') {
        flush();
        lineY -= leading;
      }
      pending += decodeStringOperand(match[2], unicodeMap);
    } else if (match[4] !== undefined) {
      flush();
      lineX = parseFloat(match[8]);
      lineY = parseFloat(match[9]);
    } else if (match[10] !== undefined) {
      flush();
      const tx = parseFloat(match[10]);
      const ty = parseFloat(match[11]);
      if (match[12] === 'TD') leading = -ty;
      lineX += tx;
      lineY += ty;
    } else if (match[13] !== undefined) {
      leading = parseFloat(match[13]);
    } else if (match[14] !== undefined) {
      const size = Math.abs(parseFloat(match[14]));
      if (size > 0) fontSize = size;
    } else if (match[15] !== undefined) {
      flush();
      lineY -= leading;
    }
  }

  flush();
}

/**
 * Regroup positioned runs into printed lines: top to bottom, left to right.
 */
function groupRunsIntoLines(runs: PositionedRun[]): string[] {
  if (runs.length === 0) return [];

  const sorted = [...runs].sort((a, b) => b.y - a.y || a.x - b.x);

  const sizes = sorted.map((run) => run.fontSize).sort((a, b) => a - b);
  const medianSize = sizes[Math.floor(sizes.length / 2)] || DEFAULT_FONT_SIZE;
  const tolerance = Math.max(medianSize * ROW_TOLERANCE_RATIO, 0.5);

  const rows: PositionedRun[][] = [];
  let current: PositionedRun[] = [];
  let currentY = 0;

  for (const run of sorted) {
    if (current.length === 0 || Math.abs(run.y - currentY) <= tolerance) {
      current.push(run);
      currentY = current.reduce((sum, r) => sum + r.y, 0) / current.length;
    } else {
      rows.push(current);
      current = [run];
      currentY = run.y;
    }
  }

  if (current.length > 0) rows.push(current);

  return rows
    .map((row) =>
      [...row]
        .sort((a, b) => a.x - b.x)
        .map((run) => run.text)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()
    )
    .filter((line) => line.length > 0);
}

/**
 * Decode a `(literal)` or `<hex>` string operand.
 */
function decodeStringOperand(operand: string, unicodeMap: UnicodeMap): string {
  if (operand.startsWith('<')) {
    return decodeHexStringWithMap(operand.slice(1, -1).replace(/\s+/g, ''), unicodeMap);
  }
  return decodePdfString(operand.slice(1, -1), unicodeMap);
}

/**
 * Decode a `[...] TJ` array, turning large negative kerning into a space.
 */
function decodeTjArray(operand: string, unicodeMap: UnicodeMap): string {
  const arrayContent = operand.slice(1, -1);
  let text = '';
  let lastWasSpace = false;

  const elementRegex = /\((?:[^()\\]|\\[\s\S])*\)|<[0-9A-Fa-f\s]*>|-?\d+\.?\d*/g;
  let match;

  while ((match = elementRegex.exec(arrayContent)) !== null) {
    const element = match[0];

    if (element.startsWith('(') || element.startsWith('<')) {
      const decoded = decodeStringOperand(element, unicodeMap);
      if (decoded) {
        text += decoded;
        lastWasSpace = false;
      }
    } else {
      const kerning = parseFloat(element);
      if (kerning < -100 && !lastWasSpace && text.length > 0) {
        text += ' ';
        lastWasSpace = true;
      }
    }
  }

  return text;
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

  result = result.replace(/\\([0-7]{1,3})/g, (_, octal) => {
    return String.fromCharCode(parseInt(octal, 8));
  });

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

  if (hex.length % 2 !== 0) {
    hex = hex + '0';
  }

  if (unicodeMap.size > 0) {
    let result = '';

    if (hex.length % 4 === 0) {
      for (let i = 0; i < hex.length; i += 4) {
        const code = parseInt(hex.substr(i, 4), 16);
        const mapped = unicodeMap.get(code);
        if (mapped !== undefined) {
          result += mapped;
        } else {
          if (code >= 32 && code < 65535) {
            result += String.fromCharCode(code);
          }
        }
      }
      if (result.length > 0) {
        return result;
      }
    }

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

  return decodeHexString(hex);
}

/**
 * Decode a hex string (supports both single-byte and UTF-16BE encoding).
 */
function decodeHexString(hex: string): string {
  if (!hex) return '';

  if (hex.length % 2 !== 0) {
    hex = hex + '0';
  }

  if (hex.length >= 4 && hex.length % 4 === 0) {
    let utf16Result = '';
    let isValidUtf16 = true;

    for (let i = 0; i < hex.length; i += 4) {
      const highByte = parseInt(hex.substr(i, 2), 16);
      const lowByte = parseInt(hex.substr(i + 2, 2), 16);
      const charCode = (highByte << 8) | lowByte;

      if (
        charCode === 0 ||
        (charCode > 0 && charCode < 32 && charCode !== 9 && charCode !== 10 && charCode !== 13)
      ) {
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

  let result = '';
  for (let i = 0; i < hex.length; i += 2) {
    const charCode = parseInt(hex.substr(i, 2), 16);
    if (charCode >= 32 && charCode <= 255) {
      result += String.fromCharCode(charCode);
    } else if (charCode === 9 || charCode === 10 || charCode === 13) {
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

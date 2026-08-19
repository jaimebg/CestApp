import { readAsStringAsync } from 'expo-file-system/legacy';
import { inflate, inflateRaw } from 'pako';
import {
  extractRowsFromStream,
  type FontInfo,
  type FontTable,
  type PositionedRow,
  type UnicodeMap,
} from './contentStream';
import type { OcrBlock } from '../ocr/index';
import { encodingTable } from './encodings';
import { createScopedLogger } from '../../utils/debug';

const logger = createScopedLogger('PDF');

export interface PdfExtractionResult {
  success: boolean;
  text: string;
  lines: string[];
  pageCount: number;
  /**
   * The first page's rows, positioned the way a text recognizer reports a
   * photograph. A PDF receipt can then go through the same zone detection as a
   * photographed one instead of being a second, geometry-blind path.
   */
  blocks: OcrBlock[];
  /** Size of the first page in PDF points, or null when it has no text. */
  dimensions: { width: number; height: number } | null;
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

    const extracted = extractTextFromPdfBytes(bytes);

    const cleanedText = clean(extracted.text);

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
        blocks: [],
        dimensions: null,
        error: 'no_text_content',
      };
    }

    const pageSize = findPageSize(pdfString);

    return {
      success: true,
      text: lines.join('\n'),
      lines,
      pageCount,
      blocks: pageSize ? rowsToBlocks(extracted.firstPageRows, pageSize.height) : [],
      dimensions: pageSize,
    };
  } catch (error) {
    logger.error('PDF extraction error:', error);
    return {
      success: false,
      text: '',
      lines: [],
      pageCount: 0,
      blocks: [],
      dimensions: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/** Strip the NUL bytes CID encoding leaves behind and collapse runs of space. */
function clean(text: string): string {
  return text
    .replace(/\x00/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/ ?\n ?/g, '\n');
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

/**
 * Extract text from PDF bytes.
 */
interface ExtractedPdf {
  text: string;
  /** Rows of the first page that carried any text. */
  firstPageRows: PositionedRow[];
}

function extractTextFromPdfBytes(bytes: Uint8Array): ExtractedPdf {
  const pdfString = bytesToString(bytes);
  const textParts: string[] = [];
  let firstPageRows: PositionedRow[] = [];

  const unicodeMaps = extractToUnicodeMaps(pdfString, bytes);
  const fonts = resolveFonts(pdfString, unicodeMaps);

  // Only reached for a font resource the document never let us resolve. Merging
  // every CMap is what this extractor did for all text, which is why the box
  // drawing font's six glyphs rewrote the receipt's per-cent signs.
  const fallbackMap: UnicodeMap = new Map();
  unicodeMaps.forEach((map) => {
    map.forEach((value, key) => fallbackMap.set(key, value));
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

    const rows = extractRowsFromStream(streamContent, fonts, fallbackMap);
    if (rows.length > 0) {
      if (firstPageRows.length === 0) firstPageRows = rows;
      textParts.push(rows.map((row) => row.text).join('\n'));
    }
  }

  return { text: textParts.join('\n'), firstPageRows };
}

/**
 * The first /MediaBox in the document, which is the page size in points.
 */
function findPageSize(pdfString: string): { width: number; height: number } | null {
  const match = /\/MediaBox\s*\[\s*([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s*\]/.exec(
    pdfString
  );
  if (!match) return null;

  const width = parseFloat(match[3]) - parseFloat(match[1]);
  const height = parseFloat(match[4]) - parseFloat(match[2]);
  if (!(width > 0) || !(height > 0)) return null;

  return { width, height };
}

/**
 * Turn positioned PDF rows into the block shape the OCR path emits.
 *
 * PDF space measures y upwards from the bottom of the page and reports a
 * baseline; the block shape measures it downwards from the top and reports the
 * top edge, so the rows are flipped here rather than in every consumer.
 */
function rowsToBlocks(rows: PositionedRow[], pageHeight: number): OcrBlock[] {
  const topOf = (baseline: number, height: number) => pageHeight - baseline - height * 0.8;

  return rows.map((row) => ({
    text: clean(row.text).trim(),
    boundingBox: {
      left: row.x,
      top: topOf(row.y, row.height),
      width: row.width,
      height: row.height,
    },
    lines: row.runs.map((run) => ({
      text: clean(run.text).trim(),
      boundingBox: {
        left: run.x,
        top: topOf(run.y, run.height),
        width: run.width,
        height: run.height,
      },
    })),
  }));
}

/**
 * Body of the object with the given id, or undefined when it is absent or
 * lives in a compressed object stream.
 */
function findObjectBody(pdfString: string, objId: string): string | undefined {
  const regex = new RegExp(`(^|[^0-9])${objId}\\s+\\d+\\s+obj([\\s\\S]*?)(?:stream|endobj)`);
  const match = regex.exec(pdfString);
  return match ? match[2] : undefined;
}

/**
 * Map each font resource name a content stream can select with Tf to the way
 * its bytes have to be read.
 *
 * A PDF names its fonts per page: `/Resources << /Font << /TT1 6 0 R >> >>`,
 * either inline or behind one more indirect reference. Each font object then
 * points at its own /ToUnicode CMap, or names a single-byte /Encoding when it
 * has none. Applying one font's CMap to another's bytes corrupts text that was
 * never broken: Carrefour's box drawing font defines six codes, and one of them
 * is the per-cent sign the tax table prints.
 */
function resolveFonts(pdfString: string, maps: Map<string, UnicodeMap>): FontTable {
  const fonts: FontTable = new Map();

  const fontDicts: string[] = [];

  const inlineRegex = /\/Font\s*<<([\s\S]*?)>>/g;
  let match;
  while ((match = inlineRegex.exec(pdfString)) !== null) {
    fontDicts.push(match[1]);
  }

  const indirectRegex = /\/Font\s+(\d+)\s+\d+\s+R/g;
  while ((match = indirectRegex.exec(pdfString)) !== null) {
    const body = findObjectBody(pdfString, match[1]);
    if (body) fontDicts.push(body);
  }

  const entryRegex = /\/([^\s/<>[\]()]+)\s+(\d+)\s+\d+\s+R/g;

  for (const dict of fontDicts) {
    entryRegex.lastIndex = 0;
    let entry;
    while ((entry = entryRegex.exec(dict)) !== null) {
      const [, resourceName, fontObjId] = entry;
      const fontBody = findObjectBody(pdfString, fontObjId);
      if (!fontBody || !/\/Type\s*\/Font/.test(fontBody)) continue;

      const info: FontInfo = {};

      const toUnicode = /\/ToUnicode\s+(\d+)\s+\d+\s+R/.exec(fontBody);
      if (toUnicode) info.unicodeMap = maps.get(toUnicode[1]);

      const encoding = /\/Encoding\s*\/([A-Za-z0-9]+)/.exec(fontBody);
      if (encoding) info.encoding = encodingTable(encoding[1]);

      fonts.set(resourceName, info);
    }
  }

  return fonts;
}

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
 * Check if a PDF has extractable text content.
 */
export async function hasPdfText(uri: string): Promise<boolean> {
  const result = await extractTextFromPdf(uri);
  return result.success && result.text.length > 0;
}

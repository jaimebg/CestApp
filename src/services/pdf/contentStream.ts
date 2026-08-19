import { type EncodingTable } from './encodings';

export type UnicodeMap = Map<number, string>;

/**
 * What a content stream needs to know about one font resource to decode the
 * bytes it shows. A font that resolves to neither a CMap nor a named encoding
 * is still an entry: it means "this font is StandardEncoding, decode as ASCII",
 * which is different from a font name we failed to resolve at all.
 */
export interface FontInfo {
  unicodeMap?: UnicodeMap;
  encoding?: EncodingTable;
}

export type FontTable = Map<string, FontInfo>;

/**
 * A run of text together with the position it is painted at, in device space
 * (y grows upwards, so the largest y is the top of the page).
 */
interface PositionedRun {
  text: string;
  x: number;
  y: number;
  fontSize: number;
}

/**
 * A printed row and the box it occupies, in PDF device space.
 *
 * Zone detection needs to know where on the page a row sits, which the text
 * alone cannot say. Emitting the geometry the scanner already resolved lets a
 * PDF go through the same zone detection as a photographed receipt.
 */
export interface PositionedRow {
  text: string;
  x: number;
  /** Baseline, measured up from the bottom of the page. */
  y: number;
  width: number;
  height: number;
  runs: { text: string; x: number; y: number; width: number; height: number }[];
}

/**
 * Advance width of one glyph as a fraction of the font size.
 *
 * The scanner does not read the /Widths array, so a run's width is estimated.
 * Receipts are set in a monospaced face at roughly this ratio, and the estimate
 * only has to be good enough to place a zone rectangle over the page.
 */
const GLYPH_ADVANCE_RATIO = 0.6;

function runWidth(run: PositionedRun): number {
  return run.text.length * run.fontSize * GLYPH_ADVANCE_RATIO;
}

interface Matrix {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

const IDENTITY: Matrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

const DEFAULT_FONT_SIZE = 10;

/**
 * Fraction of the font size within which two runs are treated as sharing a
 * baseline. Cells of one table row are emitted with an identical y, so this
 * only has to absorb rounding and the odd superscript.
 */
const ROW_TOLERANCE_RATIO = 0.3;

/** m applied first, then n. */
function concat(m: Matrix, n: Matrix): Matrix {
  return {
    a: m.a * n.a + m.b * n.c,
    b: m.a * n.b + m.b * n.d,
    c: m.c * n.a + m.d * n.c,
    d: m.c * n.b + m.d * n.d,
    e: m.e * n.a + m.f * n.c + n.e,
    f: m.e * n.b + m.f * n.d + n.f,
  };
}

function translation(tx: number, ty: number): Matrix {
  return { a: 1, b: 0, c: 0, d: 1, e: tx, f: ty };
}

type Operand =
  | { kind: 'number'; value: number }
  | { kind: 'string'; value: string }
  | { kind: 'name'; value: string }
  | { kind: 'array'; value: string };

function isWhitespace(char: string): boolean {
  return (
    char === ' ' ||
    char === '\n' ||
    char === '\r' ||
    char === '\t' ||
    char === '\f' ||
    char === '\0'
  );
}

function isDelimiter(char: string): boolean {
  return (
    char === '(' ||
    char === ')' ||
    char === '<' ||
    char === '>' ||
    char === '[' ||
    char === ']' ||
    char === '{' ||
    char === '}' ||
    char === '/' ||
    char === '%'
  );
}

/**
 * Index just past the `(...)` literal that starts at `start`, honouring
 * balanced inner parentheses and backslash escapes.
 */
function endOfLiteralString(content: string, start: number): number {
  let depth = 0;
  for (let i = start; i < content.length; i++) {
    const char = content[i];
    if (char === '\\') {
      i++;
      continue;
    }
    if (char === '(') depth++;
    else if (char === ')') {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  return content.length;
}

/** Index just past the `[...]` array that starts at `start`. */
function endOfArray(content: string, start: number): number {
  let depth = 0;
  for (let i = start; i < content.length; i++) {
    const char = content[i];
    if (char === '(') {
      i = endOfLiteralString(content, i) - 1;
      continue;
    }
    if (char === '[') depth++;
    else if (char === ']') {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  return content.length;
}

/** Index just past the `<<...>>` dictionary that starts at `start`. */
function endOfDictionary(content: string, start: number): number {
  let depth = 0;
  for (let i = start; i < content.length; i++) {
    if (content[i] === '(') {
      i = endOfLiteralString(content, i) - 1;
      continue;
    }
    if (content.startsWith('<<', i)) {
      depth++;
      i++;
      continue;
    }
    if (content.startsWith('>>', i)) {
      depth--;
      i++;
      if (depth === 0) return i + 1;
    }
  }
  return content.length;
}

/**
 * Walk a content stream and emit one positioned run per text-showing position.
 *
 * The scanner reads PDF object syntax rather than matching operators with a
 * regex, because a regex cannot tell an operator from the same letters inside a
 * string a receipt happens to print. Splitting blocks on a bare `ET` silently
 * swallowed every row containing GALLETAS, DONETTES or COCA COLA PET.
 *
 * Positions are resolved through the full text-rendering matrix (Tm concatenated
 * with the CTM), so a producer that flips the y axis with `cm` -- Carrefour
 * wraps every block in `1 0 0 -1 20 906 cm` -- still yields a page whose largest
 * y is its top line.
 */
function collectRuns(
  content: string,
  fonts: FontTable,
  fallbackMap: UnicodeMap,
  runs: PositionedRun[]
): void {
  let ctm: Matrix = IDENTITY;
  const graphicsStack: Matrix[] = [];

  let textMatrix: Matrix = IDENTITY;
  let lineMatrix: Matrix = IDENTITY;
  let leading = 0;
  let fontSize = DEFAULT_FONT_SIZE;
  let font: FontInfo | undefined;

  let pending = '';
  let pendingX = 0;
  let pendingY = 0;
  let pendingSize = DEFAULT_FONT_SIZE;

  let operands: Operand[] = [];

  const numberAt = (indexFromEnd: number): number => {
    const operand = operands[operands.length - indexFromEnd];
    return operand !== undefined && operand.kind === 'number' ? operand.value : 0;
  };

  const flush = () => {
    if (pending.length > 0) {
      runs.push({ text: pending, x: pendingX, y: pendingY, fontSize: pendingSize });
      pending = '';
    }
  };

  const show = (text: string) => {
    if (!text) return;
    if (pending.length === 0) {
      const rendering = concat(textMatrix, ctm);
      pendingX = rendering.e;
      pendingY = rendering.f;
      pendingSize = fontSize * Math.hypot(rendering.b, rendering.d) || DEFAULT_FONT_SIZE;
    }
    pending += text;
  };

  const nextLine = () => {
    flush();
    lineMatrix = concat(translation(0, -leading), lineMatrix);
    textMatrix = lineMatrix;
  };

  let i = 0;
  while (i < content.length) {
    const char = content[i];

    if (isWhitespace(char)) {
      i++;
      continue;
    }

    if (char === '%') {
      while (i < content.length && content[i] !== '\n' && content[i] !== '\r') i++;
      continue;
    }

    if (char === '(') {
      const end = endOfLiteralString(content, i);
      operands.push({ kind: 'string', value: content.slice(i, end) });
      i = end;
      continue;
    }

    if (char === '<') {
      if (content[i + 1] === '<') {
        i = endOfDictionary(content, i);
        continue;
      }
      const end = content.indexOf('>', i);
      const stop = end === -1 ? content.length : end + 1;
      operands.push({ kind: 'string', value: content.slice(i, stop) });
      i = stop;
      continue;
    }

    if (char === '[') {
      const end = endOfArray(content, i);
      operands.push({ kind: 'array', value: content.slice(i, end) });
      i = end;
      continue;
    }

    if (char === ']' || char === '>' || char === '{' || char === '}' || char === ')') {
      i++;
      continue;
    }

    if (char === '/') {
      let end = i + 1;
      while (end < content.length && !isWhitespace(content[end]) && !isDelimiter(content[end]))
        end++;
      operands.push({ kind: 'name', value: content.slice(i + 1, end) });
      i = end;
      continue;
    }

    let end = i;
    while (end < content.length && !isWhitespace(content[end]) && !isDelimiter(content[end])) end++;
    const token = content.slice(i, end === i ? i + 1 : end);
    i = end === i ? i + 1 : end;

    if (/^[+-.\d]/.test(token) && !Number.isNaN(Number(token))) {
      operands.push({ kind: 'number', value: Number(token) });
      continue;
    }

    switch (token) {
      case 'q':
        graphicsStack.push(ctm);
        break;
      case 'Q':
        ctm = graphicsStack.pop() ?? IDENTITY;
        break;
      case 'cm':
        ctm = concat(
          {
            a: numberAt(6),
            b: numberAt(5),
            c: numberAt(4),
            d: numberAt(3),
            e: numberAt(2),
            f: numberAt(1),
          },
          ctm
        );
        break;
      case 'BT':
        flush();
        textMatrix = IDENTITY;
        lineMatrix = IDENTITY;
        break;
      case 'ET':
        flush();
        break;
      case 'Tf': {
        const size = Math.abs(numberAt(1));
        if (size > 0) fontSize = size;
        const name = operands[operands.length - 2];
        if (name !== undefined && name.kind === 'name') font = fonts.get(name.value);
        break;
      }
      case 'Tm':
        flush();
        textMatrix = {
          a: numberAt(6),
          b: numberAt(5),
          c: numberAt(4),
          d: numberAt(3),
          e: numberAt(2),
          f: numberAt(1),
        };
        lineMatrix = textMatrix;
        break;
      case 'TD':
        leading = -numberAt(1);
      // falls through
      case 'Td':
        flush();
        lineMatrix = concat(translation(numberAt(2), numberAt(1)), lineMatrix);
        textMatrix = lineMatrix;
        break;
      case 'TL':
        leading = numberAt(1);
        break;
      case 'T*':
        nextLine();
        break;
      case 'Tj':
        show(decodeStringOperand(operands[operands.length - 1], font, fallbackMap));
        break;
      case "'":
        nextLine();
        show(decodeStringOperand(operands[operands.length - 1], font, fallbackMap));
        break;
      case '"':
        nextLine();
        show(decodeStringOperand(operands[operands.length - 1], font, fallbackMap));
        break;
      case 'TJ':
        show(decodeArrayOperand(operands[operands.length - 1], font, fallbackMap));
        break;
      default:
        break;
    }

    operands = [];
  }

  flush();
}

/**
 * Regroup positioned runs into printed lines: top to bottom, left to right.
 */
function groupRunsIntoRows(runs: PositionedRun[]): PositionedRun[][] {
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

  return rows.map((row) => [...row].sort((a, b) => a.x - b.x));
}

function rowText(row: PositionedRun[]): string {
  return row
    .map((run) => run.text)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractTextFromStream(
  content: string,
  fonts: FontTable,
  fallbackMap: UnicodeMap
): string {
  return extractRowsFromStream(content, fonts, fallbackMap)
    .map((row) => row.text)
    .join('\n');
}

/**
 * The printed rows of a content stream, each with the box it occupies.
 */
export function extractRowsFromStream(
  content: string,
  fonts: FontTable,
  fallbackMap: UnicodeMap
): PositionedRow[] {
  const runs: PositionedRun[] = [];
  collectRuns(content, fonts, fallbackMap, runs);

  const rows: PositionedRow[] = [];

  for (const row of groupRunsIntoRows(runs)) {
    const text = rowText(row);
    if (!text) continue;

    const left = Math.min(...row.map((run) => run.x));
    const right = Math.max(...row.map((run) => run.x + runWidth(run)));
    const baseline = Math.min(...row.map((run) => run.y));
    const height = Math.max(...row.map((run) => run.fontSize));

    rows.push({
      text,
      x: left,
      y: baseline,
      width: right - left,
      height,
      runs: row.map((run) => ({
        text: run.text,
        x: run.x,
        y: run.y,
        width: runWidth(run),
        height: run.fontSize,
      })),
    });
  }

  return rows;
}

function decodeStringOperand(
  operand: Operand | undefined,
  font: FontInfo | undefined,
  fallbackMap: UnicodeMap
): string {
  if (operand === undefined || operand.kind !== 'string') return '';

  if (operand.value.startsWith('<')) {
    return decodeHexStringWithMap(
      operand.value.slice(1, -1).replace(/\s+/g, ''),
      font ? (font.unicodeMap ?? new Map()) : fallbackMap
    );
  }

  return decodePdfString(operand.value.slice(1, -1), font, fallbackMap);
}

/**
 * Decode a `[...] TJ` array, turning large negative kerning into a space.
 */
function decodeArrayOperand(
  operand: Operand | undefined,
  font: FontInfo | undefined,
  fallbackMap: UnicodeMap
): string {
  if (operand === undefined || operand.kind !== 'array') return '';

  const arrayContent = operand.value.slice(1, -1);
  let text = '';
  let lastWasSpace = false;

  const elementRegex = /\((?:[^()\\]|\\[\s\S])*\)|<[0-9A-Fa-f\s]*>|-?\d+\.?\d*/g;
  let match;

  while ((match = elementRegex.exec(arrayContent)) !== null) {
    const element = match[0];

    if (element.startsWith('(') || element.startsWith('<')) {
      const decoded = decodeStringOperand({ kind: 'string', value: element }, font, fallbackMap);
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
 * Decode a literal string, resolving escapes and then the font's own character
 * mapping: its ToUnicode CMap when it has one, otherwise the single-byte table
 * its /Encoding names. A font name the document never resolved falls back to
 * the union of every CMap, which is all this extractor knew before.
 */
function decodePdfString(str: string, font: FontInfo | undefined, fallbackMap: UnicodeMap): string {
  if (!str) return '';

  let result = str
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\');

  result = result.replace(/\\([0-7]{1,3})/g, (_, octal) => String.fromCharCode(parseInt(octal, 8)));

  const map = font ? font.unicodeMap : fallbackMap;
  if (map && map.size > 0) {
    let mapped = '';
    for (let i = 0; i < result.length; i++) {
      const mappedChar = map.get(result.charCodeAt(i));
      mapped += mappedChar !== undefined ? mappedChar : result[i];
    }
    return mapped;
  }

  const encoding = font?.encoding;
  if (encoding) {
    let mapped = '';
    for (let i = 0; i < result.length; i++) {
      const code = result.charCodeAt(i);
      const mappedChar = code >= 0x80 ? encoding.get(code) : undefined;
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
        } else if (code >= 32 && code < 65535) {
          result += String.fromCharCode(code);
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

      utf16Result += String.fromCharCode(charCode);
    }

    if (isValidUtf16 && utf16Result.length > 0) {
      return utf16Result;
    }
  }

  let result = '';
  for (let i = 0; i < hex.length; i += 2) {
    const charCode = parseInt(hex.substr(i, 2), 16);
    if (charCode >= 32 || charCode === 9 || charCode === 10 || charCode === 13) {
      result += String.fromCharCode(charCode);
    }
  }
  return result;
}

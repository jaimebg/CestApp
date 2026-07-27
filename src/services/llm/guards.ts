import type { ParsedItem } from '../ocr/parser';
import { parsePrice } from '../ocr/parseUtils';

const PRICE_TOKEN = /\d+[.,]\d{2}/g;
const PRICE_EPSILON = 0.005;
const MIN_TOKEN_LENGTH = 3;

const COMBINING_MARK_START = 0x0300;
const COMBINING_MARK_END = 0x036f;

/**
 * Strips diacritics without embedding literal combining characters in source,
 * which are invisible and easy to corrupt when the file is edited.
 */
function stripDiacritics(text: string): string {
  return Array.from(text.normalize('NFD'))
    .filter((character) => {
      const code = character.charCodeAt(0);
      return code < COMBINING_MARK_START || code > COMBINING_MARK_END;
    })
    .join('');
}

export function normalizeForAnchor(text: string): string {
  return stripDiacritics(text)
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Returns the OCR line that contains the given price, or null when no line does.
 */
export function findSourceLine(price: number, lines: string[]): string | null {
  for (const line of lines) {
    const matches = line.match(PRICE_TOKEN) || [];
    for (const match of matches) {
      const parsed = parsePrice(match);
      if (parsed !== null && Math.abs(parsed - price) < PRICE_EPSILON) {
        return line;
      }
    }
  }
  return null;
}

/**
 * Anchors an item name to its source line by shared tokens rather than substring,
 * so the model may expand abbreviations without being able to invent a product.
 */
export function isAnchoredToSource(name: string, sourceLine: string): boolean {
  const lineTokens = new Set(normalizeForAnchor(sourceLine).split(' '));
  const nameTokens = normalizeForAnchor(name)
    .split(' ')
    .filter((token) => token.length >= MIN_TOKEN_LENGTH);

  return nameTokens.some((token) => {
    for (const lineToken of lineTokens) {
      if (lineToken.length < MIN_TOKEN_LENGTH) continue;
      if (lineToken.startsWith(token) || token.startsWith(lineToken)) return true;
    }
    return false;
  });
}

export function filterHallucinatedItems(items: ParsedItem[], lines: string[]): ParsedItem[] {
  return items.filter((current) => {
    const sourceLine = findSourceLine(current.totalPrice, lines);
    if (sourceLine === null) return false;
    return isAnchoredToSource(current.name, sourceLine);
  });
}

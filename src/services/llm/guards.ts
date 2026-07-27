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

function lineContainsPrice(line: string, price: number): boolean {
  const matches = line.match(PRICE_TOKEN) || [];
  return matches.some((match) => {
    const parsed = parsePrice(match);
    return parsed !== null && Math.abs(parsed - price) < PRICE_EPSILON;
  });
}

/**
 * Returns the first OCR line that contains the given price, or null when no line does.
 */
export function findSourceLine(price: number, lines: string[]): string | null {
  return lines.find((line) => lineContainsPrice(line, price)) ?? null;
}

/**
 * Anchors an item name to its source line by shared tokens rather than substring,
 * so the model may expand abbreviations without being able to invent a product.
 *
 * The prefix test runs in one direction only. A legitimate expansion always grows
 * the receipt's abbreviation into a longer word (SEMI to SEMIDESNATADA), so the
 * item name token must start with the line token. Allowing the reverse would let
 * an invented short name anchor to an unrelated longer word, such as SAL to SALSA.
 */
export function isAnchoredToSource(name: string, sourceLine: string): boolean {
  const lineTokens = new Set(normalizeForAnchor(sourceLine).split(' '));
  const nameTokens = normalizeForAnchor(name)
    .split(' ')
    .filter((token) => token.length >= MIN_TOKEN_LENGTH);

  return nameTokens.some((token) => {
    for (const lineToken of lineTokens) {
      if (lineToken.length < MIN_TOKEN_LENGTH) continue;
      if (token.startsWith(lineToken)) return true;
    }
    return false;
  });
}

/**
 * Each surviving item claims a distinct source line. Spanish receipts routinely
 * repeat round prices, so matching every item against the first line carrying its
 * price would misattribute the second product and drop it as if it were invented.
 */
export function filterHallucinatedItems(items: ParsedItem[], lines: string[]): ParsedItem[] {
  const claimed = new Set<number>();

  return items.filter((current) => {
    const index = lines.findIndex(
      (line, position) =>
        !claimed.has(position) &&
        lineContainsPrice(line, current.totalPrice) &&
        isAnchoredToSource(current.name, line)
    );

    if (index === -1) return false;
    claimed.add(index);
    return true;
  });
}

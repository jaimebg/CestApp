import type { ParsedItem } from '../ocr/parser';
import { parsePrice } from '../ocr/parseUtils';

const PRICE_TOKEN = /\d+[.,]\d{2}/g;
const PRICE_EPSILON = 0.005;
const MIN_TOKEN_LENGTH = 3;

const SUMMARY_TOKENS = [
  'TOTAL',
  'SUBTOTAL',
  'IVA',
  'IGIC',
  'IPSI',
  'CUOTA',
  'IMPONIBLE',
  'EFECTIVO',
  'TARJETA',
  'CAMBIO',
  'DEVOLUCION',
  'DESCUENTO',
  'DTO',
];

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

export type AnchorStrength = 'exact' | 'prefix' | 'none';

/**
 * Grades how firmly an item name is anchored to its source line. An exact shared
 * token is stronger evidence than a prefix expansion, and filterHallucinatedItems
 * uses that ranking to hand out lines in the right order.
 */
export function anchorStrength(name: string, sourceLine: string): AnchorStrength {
  const lineTokens = [...new Set(normalizeForAnchor(sourceLine).split(' '))].filter(
    (token) => token.length >= MIN_TOKEN_LENGTH
  );
  const nameTokens = normalizeForAnchor(name)
    .split(' ')
    .filter((token) => token.length >= MIN_TOKEN_LENGTH);

  let strength: AnchorStrength = 'none';

  for (const token of nameTokens) {
    for (const lineToken of lineTokens) {
      if (token === lineToken) return 'exact';
      if (token.startsWith(lineToken)) strength = 'prefix';
    }
  }

  return strength;
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
  return anchorStrength(name, sourceLine) !== 'none';
}

/**
 * A receipt's summary lines are never line items, whatever tokens they share with
 * a product name. Without this, an invented item named "Total compra" priced at the
 * printed total anchors to the TOTAL line and then reconciles tautologically — the
 * item sum and the total are the same number by construction — and gets applied
 * automatically over the real items.
 */
function isSummaryLine(line: string): boolean {
  const tokens = new Set(normalizeForAnchor(line).split(' '));
  return SUMMARY_TOKENS.some((token) => tokens.has(token));
}

/**
 * Each surviving item claims a distinct source line. Spanish receipts routinely
 * repeat round prices, so matching every item against the first line carrying its
 * price would misattribute the second product and drop it as if it were invented.
 *
 * Exact token matches claim their lines before prefix matches do. Greedy first-fit
 * in item order can otherwise starve a real product: with lines SAL and SALSA BRAVA
 * at the same price, "Salsa brava" would claim the SAL line by prefix and leave
 * "Sal" with nowhere to anchor, dropping a genuine item.
 */
export function filterHallucinatedItems(items: ParsedItem[], lines: string[]): ParsedItem[] {
  const claimedLine = new Map<number, number>();

  const claimAll = (strength: AnchorStrength) => {
    items.forEach((current, itemIndex) => {
      if (claimedLine.has(itemIndex)) return;
      const taken = new Set(claimedLine.values());
      const lineIndex = lines.findIndex(
        (line, position) =>
          !taken.has(position) &&
          !isSummaryLine(line) &&
          lineContainsPrice(line, current.totalPrice) &&
          anchorStrength(current.name, line) === strength
      );
      if (lineIndex !== -1) claimedLine.set(itemIndex, lineIndex);
    });
  };

  claimAll('exact');
  claimAll('prefix');

  return items.filter((_, itemIndex) => claimedLine.has(itemIndex));
}

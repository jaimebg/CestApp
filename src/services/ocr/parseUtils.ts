/**
 * Shared low-level parsing helpers for receipt text
 */

function isWordCharacter(char: string): boolean {
  return char.length > 0 && /[\p{L}\p{N}]/u.test(char);
}

/** Spanish plural endings a keyword is still allowed to be followed by. */
const PLURAL_SUFFIXES = ['s', 'es'];

function endsAtWordBoundary(haystack: string, end: number): boolean {
  if (!isWordCharacter(haystack[end] ?? '')) return true;

  return PLURAL_SUFFIXES.some(
    (suffix) =>
      haystack.startsWith(suffix, end) && !isWordCharacter(haystack[end + suffix.length] ?? '')
  );
}

/**
 * Whole-word keyword test for the parser keyword lists.
 *
 * A plain substring test silently drops real products: "iva" sits inside
 * "OLIVA", "tel" inside "NUTELLA", "due" inside "DUERO", "card" inside
 * "CARDO". A boundary is only required on an edge of the keyword that is
 * itself alphanumeric, so fragment keywords such as "www.", "@" and "s.a."
 * keep matching the way they were written to, and a trailing Spanish plural
 * still counts so "CENTROS COMERCIALES" matches "centro" and "comercial".
 */
export function containsKeyword(haystack: string, keyword: string): boolean {
  if (keyword.length === 0) return false;

  const checkStart = isWordCharacter(keyword[0]);
  const checkEnd = isWordCharacter(keyword[keyword.length - 1]);

  let from = 0;

  for (;;) {
    const index = haystack.indexOf(keyword, from);
    if (index === -1) return false;

    const before = index > 0 ? haystack[index - 1] : '';
    const end = index + keyword.length;

    if (
      (!checkStart || !isWordCharacter(before)) &&
      (!checkEnd || endsAtWordBoundary(haystack, end))
    ) {
      return true;
    }

    from = index + 1;
  }
}

/**
 * Parse price from a string
 * Handles formats: $12.34, 12.34, $12,34, 12,34, 12, 34 (with space)
 */
export function parsePrice(text: string, options?: { allowBareInteger?: boolean }): number | null {
  let cleaned = text.replace(/[$€£¥]/g, '').trim();

  cleaned = cleaned.replace(/(\d+),\s+(\d{2})/, '$1,$2');
  cleaned = cleaned.replace(/(\d+)\.\s+(\d{2})/, '$1.$2');

  const patterns = [
    /^(\d+),(\d{2})$/,
    /^(\d+)\.(\d{2})$/,
    /(\d+),(\d{2})\s*[A-Za-z]*$/,
    /(\d+)\.(\d{2})\s*[A-Za-z]*$/,
    /^(\d+),(\d{2})/,
    /^(\d+)\.(\d{2})/,
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match) {
      return parseFloat(`${match[1]}.${match[2]}`);
    }
  }

  if (options?.allowBareInteger) {
    const simpleMatch = cleaned.match(/^(\d+)$/);
    if (simpleMatch) {
      return parseInt(simpleMatch[1], 10);
    }
  }

  return null;
}

/**
 * Parse time from text
 * Returns time in HH:MM format; handles 24h, AM/PM, and "14h30" notations
 */
export function parseTime(text: string): string | null {
  const patterns = [
    /(\d{1,2}):(\d{2})\s*(am|pm|a\.m\.|p\.m\.)/i,
    /(\d{1,2}):(\d{2})(?::\d{2})?(?!\s*(?:am|pm))/i,
    /(\d{1,2})[hH](\d{2})/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      let hours = parseInt(match[1], 10);
      const minutes = match[2];

      if (match[3]) {
        const isPM = /pm|p\.m\./i.test(match[3]);
        if (isPM && hours !== 12) hours += 12;
        if (!isPM && hours === 12) hours = 0;
      }

      if (hours >= 0 && hours < 24 && parseInt(minutes, 10) < 60) {
        return `${hours.toString().padStart(2, '0')}:${minutes}`;
      }
    }
  }

  return null;
}

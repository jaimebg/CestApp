/**
 * Shared low-level parsing helpers for receipt text
 */

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

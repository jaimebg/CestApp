/**
 * The local-time bounds of the calendar day a date falls on.
 *
 * Duplicate detection compares receipts by day rather than by timestamp: the
 * same receipt read from a photo and from a PDF can disagree on the printed
 * time by a minute, and a receipt with no readable time is saved against the
 * current clock.
 */
export function dayRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

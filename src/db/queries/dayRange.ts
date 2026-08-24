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

export type HistoryDatePreset =
  'all' | 'thisWeek' | 'thisMonth' | 'last3Months' | 'thisYear' | 'custom';

export function getPresetDateRange(
  preset: HistoryDatePreset,
  custom?: { start: Date; end: Date }
): { start: Date | null; end: Date | null } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  switch (preset) {
    case 'thisWeek': {
      const mondayOffset = (now.getDay() + 6) % 7;
      const start = new Date(now);
      start.setDate(now.getDate() - mondayOffset);
      start.setHours(0, 0, 0, 0);
      return { start, end: today };
    }
    case 'thisMonth': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start, end: today };
    }
    case 'last3Months': {
      const start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      return { start, end: today };
    }
    case 'thisYear': {
      const start = new Date(now.getFullYear(), 0, 1);
      return { start, end: today };
    }
    case 'custom': {
      if (!custom) return { start: null, end: null };
      return custom;
    }
    default:
      return { start: null, end: null };
  }
}

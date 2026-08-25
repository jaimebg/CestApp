export function buildValidatedDateTime(
  day: number,
  month: number,
  year: number,
  time: string | null
): Date | null {
  if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > 2200) {
    return null;
  }

  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  if (time) {
    const match = time.match(/^(\d{1,2}):(\d{2})$/);
    if (match) {
      const hours = Number(match[1]);
      const minutes = Number(match[2]);
      if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
        date.setHours(hours, minutes, 0, 0);
      }
    }
  }

  return date;
}

/**
 * The app's language preference, as a BCP 47 tag.
 *
 * Never pass `undefined` to a `toLocale*` call: that follows the device, so a
 * Spanish app on an English phone renders English weekdays and months next to
 * Spanish UI chrome.
 */
function localeFor(language: 'en' | 'es'): string {
  return language === 'es' ? 'es-ES' : 'en-GB';
}

export function formatLocalizedDate(date: Date, language: 'en' | 'es'): string {
  return date.toLocaleDateString(localeFor(language), {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatLocalizedTime(date: Date, language: 'en' | 'es'): string {
  return date.toLocaleTimeString(localeFor(language), { hour: '2-digit', minute: '2-digit' });
}

/** `Mon, 24 Aug` / `lun, 24 ago` — receipt cards and list rows. */
export function formatShortDate(date: Date, language: 'en' | 'es'): string {
  return date.toLocaleDateString(localeFor(language), {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/** `Mon 24` / `lun 24` — chart axis ticks, where the month is already implied. */
export function formatDayLabel(date: Date, language: 'en' | 'es'): string {
  return date.toLocaleDateString(localeFor(language), { weekday: 'short', day: 'numeric' });
}

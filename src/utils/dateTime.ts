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

export function formatLocalizedDate(date: Date, language: 'en' | 'es'): string {
  const locale = language === 'es' ? 'es-ES' : 'en-GB';
  return date.toLocaleDateString(locale, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatLocalizedTime(date: Date, language: 'en' | 'es'): string {
  const locale = language === 'es' ? 'es-ES' : 'en-GB';
  return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

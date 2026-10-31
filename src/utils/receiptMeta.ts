import type { TFunction } from 'i18next';
import { formatShortDate } from './dateTime';

/** `vie, 30 oct · 10 artículos` — what a receipt row says under its store. */
export function receiptMeta(
  dateTime: Date | null,
  itemCount: number,
  language: 'en' | 'es',
  t: TFunction
): string {
  const date = dateTime ? formatShortDate(new Date(dateTime), language) : t('scan.noDateFound');
  return itemCount > 0 ? `${date} · ${t('scan.itemCount', { count: itemCount })}` : date;
}

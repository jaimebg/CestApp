import type { TFunction } from 'i18next';
import { receiptMeta } from '../receiptMeta';

const t = ((key: string, options?: { count?: number }) =>
  key === 'scan.itemCount' ? `${options?.count} artículos` : key) as unknown as TFunction;

describe('receiptMeta', () => {
  it('joins the short date and the item count', () => {
    expect(receiptMeta(new Date(2026, 9, 30), 10, 'es', t)).toBe('vie, 30 oct · 10 artículos');
  });

  it('leaves the count out when nothing was itemised', () => {
    expect(receiptMeta(new Date(2026, 9, 30), 0, 'es', t)).toBe('vie, 30 oct');
  });

  it('says there is no date when the receipt has none', () => {
    expect(receiptMeta(null, 3, 'es', t)).toBe('scan.noDateFound · 3 artículos');
  });
});

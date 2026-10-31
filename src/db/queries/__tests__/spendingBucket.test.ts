import { SQLiteSyncDialect } from 'drizzle-orm/sqlite-core';
import { spendingBucket } from '../spendingBucket';

const render = (period: 'week' | 'month' | 'year') =>
  new SQLiteSyncDialect().sqlToQuery(spendingBucket(period)).sql;

describe('spendingBucket', () => {
  it('buckets days in local time, so a 00:30 receipt lands on its own day', () => {
    expect(render('month')).toBe(`DATE("receipts"."date_time", 'unixepoch', 'localtime')`);
    expect(render('week')).toBe(`DATE("receipts"."date_time", 'unixepoch', 'localtime')`);
  });

  it('buckets months in local time for the year view', () => {
    expect(render('year')).toBe(
      `strftime('%Y-%m', "receipts"."date_time", 'unixepoch', 'localtime')`
    );
  });
});

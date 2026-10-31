import { sql } from 'drizzle-orm';
import { receipts } from '../schema/receipts';
import type { TimePeriod } from './analytics';

/**
 * The bucket a receipt falls in on the spending chart: its local day, or its
 * local month for the year view. `localtime` matters: without it SQLite buckets
 * in UTC, and a receipt at 00:30 in Spain lands on the previous day.
 */
export function spendingBucket(period: TimePeriod) {
  return period === 'year'
    ? sql<string>`strftime('%Y-%m', ${receipts.dateTime}, 'unixepoch', 'localtime')`
    : sql<string>`DATE(${receipts.dateTime}, 'unixepoch', 'localtime')`;
}

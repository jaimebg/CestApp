import { db } from '../client';
import { receipts } from '../schema/receipts';
import { items } from '../schema/items';
import { categories } from '../schema/categories';
import { stores } from '../schema/stores';
import { sql, eq, gte, lte, and, desc } from 'drizzle-orm';
import type { CurrencyTotal } from '@/src/utils/currencyTotals';

export type TimePeriod = 'week' | 'month' | 'year' | 'all';

interface DateRange {
  start: Date;
  end: Date;
}

export function getDateRange(period: TimePeriod): DateRange {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  let start: Date;

  switch (period) {
    case 'week':
      start = new Date(end);
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      break;
    case 'month':
      start = new Date(end.getFullYear(), end.getMonth(), 1, 0, 0, 0, 0);
      break;
    case 'year':
      start = new Date(end.getFullYear(), 0, 1, 0, 0, 0, 0);
      break;
    case 'all':
    default:
      start = new Date(2000, 0, 1);
      break;
  }

  return { start, end };
}

/** Spending in the period, one total per currency, never added across them. */
export async function getTotalsByCurrency(period: TimePeriod): Promise<CurrencyTotal[]> {
  const { start, end } = getDateRange(period);

  const result = await db
    .select({
      currency: receipts.currency,
      total: sql<number>`COALESCE(SUM(${receipts.totalAmount}), 0)`.as('total'),
    })
    .from(receipts)
    .where(and(gte(receipts.dateTime, start), lte(receipts.dateTime, end)))
    .groupBy(receipts.currency)
    .orderBy(desc(sql`total`));

  return result.map((r) => ({ currency: r.currency, total: (r.total || 0) / 100 }));
}

function inPeriodAndCurrency(period: TimePeriod, currency: string) {
  const { start, end } = getDateRange(period);
  return and(
    gte(receipts.dateTime, start),
    lte(receipts.dateTime, end),
    eq(receipts.currency, currency)
  );
}

export async function getSpendingByDay(
  period: TimePeriod,
  currency: string
): Promise<{ date: string; amount: number }[]> {
  const bucketExpr =
    period === 'year'
      ? sql<string>`strftime('%Y-%m', ${receipts.dateTime}, 'unixepoch')`
      : sql<string>`DATE(${receipts.dateTime}, 'unixepoch')`;

  const result = await db
    .select({
      date: bucketExpr.as('date'),
      amount: sql<number>`COALESCE(SUM(${receipts.totalAmount}), 0)`.as('amount'),
    })
    .from(receipts)
    .where(inPeriodAndCurrency(period, currency))
    .groupBy(bucketExpr)
    .orderBy(bucketExpr);

  return result.map((r) => ({
    date: r.date,
    amount: (r.amount || 0) / 100,
  }));
}

export async function getSpendingByCategory(
  period: TimePeriod,
  currency: string
): Promise<
  {
    categoryId: number;
    categoryName: string | null;
    categoryIcon: string | null;
    categoryColor: string | null;
    amount: number;
    percentage: number;
  }[]
> {
  const result = await db
    .select({
      categoryId: categories.id,
      categoryName: categories.name,
      categoryIcon: categories.icon,
      categoryColor: categories.color,
      amount: sql<number>`COALESCE(SUM(${items.price}), 0)`.as('amount'),
    })
    .from(items)
    .innerJoin(receipts, eq(items.receiptId, receipts.id))
    .leftJoin(categories, eq(items.categoryId, categories.id))
    .where(inPeriodAndCurrency(period, currency))
    .groupBy(categories.id, categories.name, categories.icon, categories.color)
    .orderBy(desc(sql`amount`));

  const total = result.reduce((sum, r) => sum + (r.amount || 0), 0);

  return result.map((r) => ({
    categoryId: r.categoryId || 0,
    categoryName: r.categoryName,
    categoryIcon: r.categoryIcon,
    categoryColor: r.categoryColor,
    amount: (r.amount || 0) / 100,
    percentage: total > 0 ? ((r.amount || 0) / total) * 100 : 0,
  }));
}

export async function getSpendingByStore(
  period: TimePeriod,
  currency: string
): Promise<
  {
    storeId: number;
    storeName: string | null;
    amount: number;
    receiptCount: number;
    percentage: number;
  }[]
> {
  const result = await db
    .select({
      storeId: stores.id,
      storeName: stores.name,
      amount: sql<number>`COALESCE(SUM(${receipts.totalAmount}), 0)`.as('amount'),
      receiptCount: sql<number>`COUNT(${receipts.id})`.as('receiptCount'),
    })
    .from(receipts)
    .leftJoin(stores, eq(receipts.storeId, stores.id))
    .where(inPeriodAndCurrency(period, currency))
    .groupBy(stores.id, stores.name)
    .orderBy(desc(sql`amount`));

  const total = result.reduce((sum, r) => sum + (r.amount || 0), 0);

  return result.map((r) => ({
    storeId: r.storeId || 0,
    storeName: r.storeName,
    amount: (r.amount || 0) / 100,
    receiptCount: r.receiptCount || 0,
    percentage: total > 0 ? ((r.amount || 0) / total) * 100 : 0,
  }));
}

export async function getReceiptCount(period: TimePeriod): Promise<number> {
  const { start, end } = getDateRange(period);

  const result = await db
    .select({
      count: sql<number>`COUNT(*)`.as('count'),
    })
    .from(receipts)
    .where(and(gte(receipts.dateTime, start), lte(receipts.dateTime, end)));

  return result[0]?.count || 0;
}

export async function getAverageSpending(period: TimePeriod, currency: string): Promise<number> {
  const result = await db
    .select({
      average: sql<number>`COALESCE(AVG(${receipts.totalAmount}), 0)`.as('average'),
    })
    .from(receipts)
    .where(inPeriodAndCurrency(period, currency));

  return (result[0]?.average || 0) / 100;
}

export async function getAnalyticsSummary(period: TimePeriod, currency: string) {
  const [totals, average, receiptCount, spendingByDay, spendingByCategory, spendingByStore] =
    await Promise.all([
      getTotalsByCurrency(period),
      getAverageSpending(period, currency),
      getReceiptCount(period),
      getSpendingByDay(period, currency),
      getSpendingByCategory(period, currency),
      getSpendingByStore(period, currency),
    ]);

  return {
    total: totals.find((t) => t.currency === currency)?.total ?? 0,
    average,
    receiptCount,
    spendingByDay,
    spendingByCategory,
    spendingByStore,
    currencies: totals.map((t) => t.currency),
  };
}

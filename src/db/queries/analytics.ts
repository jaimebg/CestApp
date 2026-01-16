import { db } from '../client';
import { receipts } from '../schema/receipts';
import { items } from '../schema/items';
import { categories } from '../schema/categories';
import { stores } from '../schema/stores';
import { sql, eq, gte, lte, and, desc } from 'drizzle-orm';

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
      start = new Date(2000, 0, 1); // Far in the past
      break;
  }

  return { start, end };
}

// Get total spending for a period
export async function getTotalSpending(period: TimePeriod): Promise<number> {
  const { start, end } = getDateRange(period);

  const result = await db
    .select({
      total: sql<number>`COALESCE(SUM(${receipts.totalAmount}), 0)`.as('total'),
    })
    .from(receipts)
    .where(
      and(
        gte(receipts.dateTime, start),
        lte(receipts.dateTime, end)
      )
    );

  return (result[0]?.total || 0) / 100; // Convert cents to dollars
}

// Get spending by day for charts
export async function getSpendingByDay(period: TimePeriod): Promise<{ date: string; amount: number }[]> {
  const { start, end } = getDateRange(period);

  const result = await db
    .select({
      date: sql<string>`DATE(${receipts.dateTime})`.as('date'),
      amount: sql<number>`COALESCE(SUM(${receipts.totalAmount}), 0)`.as('amount'),
    })
    .from(receipts)
    .where(
      and(
        gte(receipts.dateTime, start),
        lte(receipts.dateTime, end)
      )
    )
    .groupBy(sql`DATE(${receipts.dateTime})`)
    .orderBy(sql`DATE(${receipts.dateTime})`);

  return result.map((r) => ({
    date: r.date,
    amount: (r.amount || 0) / 100,
  }));
}

// Get spending by category
export async function getSpendingByCategory(period: TimePeriod): Promise<{
  categoryId: number;
  categoryName: string;
  categoryIcon: string | null;
  categoryColor: string | null;
  amount: number;
  percentage: number;
}[]> {
  const { start, end } = getDateRange(period);

  // Get items with their receipts in the period
  const result = await db
    .select({
      categoryId: categories.id,
      categoryName: categories.name,
      categoryIcon: categories.icon,
      categoryColor: categories.color,
      amount: sql<number>`COALESCE(SUM(${items.price} * ${items.quantity}), 0)`.as('amount'),
    })
    .from(items)
    .innerJoin(receipts, eq(items.receiptId, receipts.id))
    .leftJoin(categories, eq(items.categoryId, categories.id))
    .where(
      and(
        gte(receipts.dateTime, start),
        lte(receipts.dateTime, end)
      )
    )
    .groupBy(categories.id, categories.name, categories.icon, categories.color)
    .orderBy(desc(sql`amount`));

  // Calculate total for percentages
  const total = result.reduce((sum, r) => sum + (r.amount || 0), 0);

  return result.map((r) => ({
    categoryId: r.categoryId || 0,
    categoryName: r.categoryName || 'Uncategorized',
    categoryIcon: r.categoryIcon,
    categoryColor: r.categoryColor,
    amount: (r.amount || 0) / 100,
    percentage: total > 0 ? ((r.amount || 0) / total) * 100 : 0,
  }));
}

// Get spending by store
export async function getSpendingByStore(period: TimePeriod): Promise<{
  storeId: number;
  storeName: string;
  amount: number;
  receiptCount: number;
  percentage: number;
}[]> {
  const { start, end } = getDateRange(period);

  const result = await db
    .select({
      storeId: stores.id,
      storeName: stores.name,
      amount: sql<number>`COALESCE(SUM(${receipts.totalAmount}), 0)`.as('amount'),
      receiptCount: sql<number>`COUNT(${receipts.id})`.as('receiptCount'),
    })
    .from(receipts)
    .leftJoin(stores, eq(receipts.storeId, stores.id))
    .where(
      and(
        gte(receipts.dateTime, start),
        lte(receipts.dateTime, end)
      )
    )
    .groupBy(stores.id, stores.name)
    .orderBy(desc(sql`amount`));

  // Calculate total for percentages
  const total = result.reduce((sum, r) => sum + (r.amount || 0), 0);

  return result.map((r) => ({
    storeId: r.storeId || 0,
    storeName: r.storeName || 'Unknown Store',
    amount: (r.amount || 0) / 100,
    receiptCount: r.receiptCount || 0,
    percentage: total > 0 ? ((r.amount || 0) / total) * 100 : 0,
  }));
}

// Get receipt count for a period
export async function getReceiptCount(period: TimePeriod): Promise<number> {
  const { start, end } = getDateRange(period);

  const result = await db
    .select({
      count: sql<number>`COUNT(*)`.as('count'),
    })
    .from(receipts)
    .where(
      and(
        gte(receipts.dateTime, start),
        lte(receipts.dateTime, end)
      )
    );

  return result[0]?.count || 0;
}

// Get average spending per receipt
export async function getAverageSpending(period: TimePeriod): Promise<number> {
  const { start, end } = getDateRange(period);

  const result = await db
    .select({
      average: sql<number>`COALESCE(AVG(${receipts.totalAmount}), 0)`.as('average'),
    })
    .from(receipts)
    .where(
      and(
        gte(receipts.dateTime, start),
        lte(receipts.dateTime, end)
      )
    );

  return (result[0]?.average || 0) / 100;
}

// Get all analytics data at once
export async function getAnalyticsSummary(period: TimePeriod) {
  const [total, average, receiptCount, spendingByDay, spendingByCategory, spendingByStore] =
    await Promise.all([
      getTotalSpending(period),
      getAverageSpending(period),
      getReceiptCount(period),
      getSpendingByDay(period),
      getSpendingByCategory(period),
      getSpendingByStore(period),
    ]);

  return {
    total,
    average,
    receiptCount,
    spendingByDay,
    spendingByCategory,
    spendingByStore,
  };
}

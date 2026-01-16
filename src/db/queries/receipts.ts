import { db } from '../client';
import { receipts, items, stores, type NewReceipt } from '../schema';
import { eq, desc, and, gte, lte, sql } from 'drizzle-orm';

export async function getReceipts(limit = 50, offset = 0) {
  return db
    .select({
      receipt: receipts,
      store: stores,
    })
    .from(receipts)
    .leftJoin(stores, eq(receipts.storeId, stores.id))
    .orderBy(desc(receipts.dateTime))
    .limit(limit)
    .offset(offset);
}

export async function getReceiptById(id: number) {
  const receipt = await db
    .select({
      receipt: receipts,
      store: stores,
    })
    .from(receipts)
    .leftJoin(stores, eq(receipts.storeId, stores.id))
    .where(eq(receipts.id, id))
    .limit(1);

  if (receipt.length === 0) return null;

  const receiptItems = await db.select().from(items).where(eq(items.receiptId, id));

  return {
    ...receipt[0],
    items: receiptItems,
  };
}

export async function getReceiptsByDateRange(startDate: Date, endDate: Date) {
  return db
    .select({
      receipt: receipts,
      store: stores,
    })
    .from(receipts)
    .leftJoin(stores, eq(receipts.storeId, stores.id))
    .where(and(gte(receipts.dateTime, startDate), lte(receipts.dateTime, endDate)))
    .orderBy(desc(receipts.dateTime));
}

export async function getReceiptsByStore(storeId: number) {
  return db
    .select()
    .from(receipts)
    .where(eq(receipts.storeId, storeId))
    .orderBy(desc(receipts.dateTime));
}

export async function createReceipt(data: NewReceipt) {
  const result = await db.insert(receipts).values(data).returning();
  return result[0];
}

export async function updateReceipt(id: number, data: Partial<NewReceipt>) {
  const result = await db
    .update(receipts)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(receipts.id, id))
    .returning();
  return result[0];
}

export async function deleteReceipt(id: number) {
  await db.delete(receipts).where(eq(receipts.id, id));
}

export async function getMonthlySpending(year: number, month: number) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const result = await db
    .select({
      total: sql<number>`SUM(${receipts.totalAmount})`,
      count: sql<number>`COUNT(*)`,
    })
    .from(receipts)
    .where(and(gte(receipts.dateTime, startDate), lte(receipts.dateTime, endDate)));

  return {
    total: result[0]?.total || 0,
    count: result[0]?.count || 0,
  };
}

export async function getRecentReceipts(limit = 5) {
  return db
    .select({
      receipt: receipts,
      store: stores,
    })
    .from(receipts)
    .leftJoin(stores, eq(receipts.storeId, stores.id))
    .orderBy(desc(receipts.createdAt))
    .limit(limit);
}

export async function getReceiptsWithItemCount(limit = 50, offset = 0) {
  const result = await db
    .select({
      receipt: receipts,
      store: stores,
      itemCount: sql<number>`(
        SELECT COUNT(*) FROM items WHERE items.receipt_id = receipts.id
      )`,
    })
    .from(receipts)
    .leftJoin(stores, eq(receipts.storeId, stores.id))
    .orderBy(desc(receipts.dateTime))
    .limit(limit)
    .offset(offset);

  return result;
}

export async function searchReceipts(searchTerm: string, limit = 50) {
  const searchPattern = `%${searchTerm.toLowerCase()}%`;

  return db
    .select({
      receipt: receipts,
      store: stores,
      itemCount: sql<number>`(
        SELECT COUNT(*) FROM items WHERE items.receipt_id = receipts.id
      )`,
    })
    .from(receipts)
    .leftJoin(stores, eq(receipts.storeId, stores.id))
    .where(
      sql`(
        LOWER(${stores.name}) LIKE ${searchPattern}
        OR EXISTS (
          SELECT 1 FROM items
          WHERE items.receipt_id = receipts.id
          AND LOWER(items.name) LIKE ${searchPattern}
        )
      )`
    )
    .orderBy(desc(receipts.dateTime))
    .limit(limit);
}

export interface ReceiptFilters {
  storeId?: number | null;
  startDate?: Date | null;
  endDate?: Date | null;
  searchTerm?: string | null;
}

export async function getFilteredReceipts(filters: ReceiptFilters, limit = 50, offset = 0) {
  const conditions: ReturnType<typeof sql>[] = [];

  if (filters.storeId) {
    conditions.push(sql`${receipts.storeId} = ${filters.storeId}`);
  }

  if (filters.startDate) {
    conditions.push(sql`${receipts.dateTime} >= ${filters.startDate}`);
  }

  if (filters.endDate) {
    conditions.push(sql`${receipts.dateTime} <= ${filters.endDate}`);
  }

  if (filters.searchTerm) {
    const searchPattern = `%${filters.searchTerm.toLowerCase()}%`;
    conditions.push(
      sql`(
        LOWER(${stores.name}) LIKE ${searchPattern}
        OR EXISTS (
          SELECT 1 FROM items
          WHERE items.receipt_id = receipts.id
          AND LOWER(items.name) LIKE ${searchPattern}
        )
      )`
    );
  }

  const baseQuery = db
    .select({
      receipt: receipts,
      store: stores,
      itemCount: sql<number>`(
        SELECT COUNT(*) FROM items WHERE items.receipt_id = receipts.id
      )`,
    })
    .from(receipts)
    .leftJoin(stores, eq(receipts.storeId, stores.id));

  if (conditions.length > 0) {
    const combinedCondition = conditions.reduce((acc, cond, idx) =>
      idx === 0 ? cond : sql`${acc} AND ${cond}`
    );
    return baseQuery
      .where(combinedCondition)
      .orderBy(desc(receipts.dateTime))
      .limit(limit)
      .offset(offset);
  }

  return baseQuery.orderBy(desc(receipts.dateTime)).limit(limit).offset(offset);
}

export async function getStoresWithReceipts() {
  return db
    .selectDistinct({
      id: stores.id,
      name: stores.name,
    })
    .from(stores)
    .innerJoin(receipts, eq(receipts.storeId, stores.id))
    .orderBy(stores.name);
}

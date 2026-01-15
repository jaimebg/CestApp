import { db } from '../client';
import { receipts, items, stores, type NewReceipt, type Receipt } from '../schema';
import { eq, desc, and, gte, lte, sql } from 'drizzle-orm';

// Get all receipts with store info
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

// Get receipt by ID with items
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

  const receiptItems = await db
    .select()
    .from(items)
    .where(eq(items.receiptId, id));

  return {
    ...receipt[0],
    items: receiptItems,
  };
}

// Get receipts by date range
export async function getReceiptsByDateRange(startDate: Date, endDate: Date) {
  return db
    .select({
      receipt: receipts,
      store: stores,
    })
    .from(receipts)
    .leftJoin(stores, eq(receipts.storeId, stores.id))
    .where(
      and(
        gte(receipts.dateTime, startDate),
        lte(receipts.dateTime, endDate)
      )
    )
    .orderBy(desc(receipts.dateTime));
}

// Get receipts by store
export async function getReceiptsByStore(storeId: number) {
  return db
    .select()
    .from(receipts)
    .where(eq(receipts.storeId, storeId))
    .orderBy(desc(receipts.dateTime));
}

// Create receipt
export async function createReceipt(data: NewReceipt) {
  const result = await db.insert(receipts).values(data).returning();
  return result[0];
}

// Update receipt
export async function updateReceipt(id: number, data: Partial<NewReceipt>) {
  const result = await db
    .update(receipts)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(receipts.id, id))
    .returning();
  return result[0];
}

// Delete receipt
export async function deleteReceipt(id: number) {
  await db.delete(receipts).where(eq(receipts.id, id));
}

// Get monthly spending
export async function getMonthlySpending(year: number, month: number) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const result = await db
    .select({
      total: sql<number>`SUM(${receipts.totalAmount})`,
      count: sql<number>`COUNT(*)`,
    })
    .from(receipts)
    .where(
      and(
        gte(receipts.dateTime, startDate),
        lte(receipts.dateTime, endDate)
      )
    );

  return {
    total: result[0]?.total || 0,
    count: result[0]?.count || 0,
  };
}

// Get recent receipts
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

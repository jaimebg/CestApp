import { db } from '../client';
import { items, categories, type NewItem } from '../schema';
import { eq, sql } from 'drizzle-orm';

export async function getItemsByReceiptId(receiptId: number) {
  return db
    .select({
      item: items,
      category: categories,
    })
    .from(items)
    .leftJoin(categories, eq(items.categoryId, categories.id))
    .where(eq(items.receiptId, receiptId));
}

export async function createItem(data: NewItem) {
  const result = await db.insert(items).values(data).returning();
  return result[0];
}

export async function createItems(data: NewItem[]) {
  if (data.length === 0) return [];
  const result = await db.insert(items).values(data).returning();
  return result;
}

export async function updateItem(id: number, data: Partial<NewItem>) {
  const result = await db
    .update(items)
    .set({ ...data, isManuallyEdited: true })
    .where(eq(items.id, id))
    .returning();
  return result[0];
}

export async function deleteItem(id: number) {
  await db.delete(items).where(eq(items.id, id));
}

export async function getSpendingByCategory() {
  return db
    .select({
      categoryId: items.categoryId,
      categoryName: categories.name,
      categoryIcon: categories.icon,
      categoryColor: categories.color,
      total: sql<number>`SUM(${items.price})`,
      count: sql<number>`COUNT(*)`,
    })
    .from(items)
    .leftJoin(categories, eq(items.categoryId, categories.id))
    .groupBy(items.categoryId);
}

import { db } from '../client';
import { stores, type NewStore } from '../schema';
import { eq, like } from 'drizzle-orm';

export async function getStores() {
  return db.select().from(stores).orderBy(stores.name);
}

export async function getStoreById(id: number) {
  const result = await db.select().from(stores).where(eq(stores.id, id)).limit(1);
  return result[0] || null;
}

export async function getStoreByNormalizedName(normalizedName: string) {
  const result = await db
    .select()
    .from(stores)
    .where(eq(stores.normalizedName, normalizedName))
    .limit(1);
  return result[0] || null;
}

export async function searchStores(query: string) {
  return db
    .select()
    .from(stores)
    .where(like(stores.name, `%${query}%`))
    .orderBy(stores.name);
}

export async function createStore(data: NewStore) {
  const result = await db.insert(stores).values(data).returning();
  return result[0];
}

export async function findOrCreateStore(name: string): Promise<number> {
  const normalizedName = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '');

  const existing = await getStoreByNormalizedName(normalizedName);
  if (existing) return existing.id;

  const newStore = await createStore({
    name: name.trim(),
    normalizedName,
  });

  return newStore.id;
}

export async function updateStore(id: number, data: Partial<NewStore>) {
  const result = await db
    .update(stores)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(stores.id, id))
    .returning();
  return result[0];
}

export async function deleteStore(id: number) {
  await db.delete(stores).where(eq(stores.id, id));
}

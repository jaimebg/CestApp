import { db } from '../client';
import { categories, type NewCategory } from '../schema';
import { eq } from 'drizzle-orm';

export async function getCategories() {
  return db.select().from(categories).orderBy(categories.name);
}

export async function getCategoryById(id: number) {
  const result = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
  return result[0] || null;
}

export async function getDefaultCategories() {
  return db
    .select()
    .from(categories)
    .where(eq(categories.isDefault, true))
    .orderBy(categories.name);
}

export async function createCategory(data: NewCategory) {
  const result = await db.insert(categories).values(data).returning();
  return result[0];
}

export async function updateCategory(id: number, data: Partial<NewCategory>) {
  const result = await db.update(categories).set(data).where(eq(categories.id, id)).returning();
  return result[0];
}

export async function deleteCategory(id: number) {
  const category = await getCategoryById(id);
  if (category?.isDefault) {
    throw new Error('Cannot delete default category');
  }
  await db.delete(categories).where(eq(categories.id, id));
}

export async function findCategoryByKeyword(itemName: string): Promise<number | null> {
  const normalizedName = itemName.toLowerCase();
  const allCategories = await getCategories();

  for (const category of allCategories) {
    const keywords = category.keywords || [];
    for (const keyword of keywords) {
      if (normalizedName.includes(keyword.toLowerCase())) {
        return category.id;
      }
    }
  }

  const otherCategory = allCategories.find((c) => c.name === 'Other');
  return otherCategory?.id || null;
}

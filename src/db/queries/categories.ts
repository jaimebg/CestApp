import { db } from '../client';
import { categories, type NewCategory } from '../schema';
import { eq } from 'drizzle-orm';

// Get all categories
export async function getCategories() {
  return db.select().from(categories).orderBy(categories.name);
}

// Get category by ID
export async function getCategoryById(id: number) {
  const result = await db
    .select()
    .from(categories)
    .where(eq(categories.id, id))
    .limit(1);
  return result[0] || null;
}

// Get default categories
export async function getDefaultCategories() {
  return db
    .select()
    .from(categories)
    .where(eq(categories.isDefault, true))
    .orderBy(categories.name);
}

// Create category
export async function createCategory(data: NewCategory) {
  const result = await db.insert(categories).values(data).returning();
  return result[0];
}

// Update category
export async function updateCategory(id: number, data: Partial<NewCategory>) {
  const result = await db
    .update(categories)
    .set(data)
    .where(eq(categories.id, id))
    .returning();
  return result[0];
}

// Delete category (only non-default)
export async function deleteCategory(id: number) {
  // Don't delete default categories
  const category = await getCategoryById(id);
  if (category?.isDefault) {
    throw new Error('Cannot delete default category');
  }
  await db.delete(categories).where(eq(categories.id, id));
}

// Find category by keyword matching
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

  // Return "Other" category as fallback
  const otherCategory = allCategories.find(c => c.name === 'Other');
  return otherCategory?.id || null;
}

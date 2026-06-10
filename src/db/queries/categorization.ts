import { db } from '../client';
import { categories, userLearnedItems } from '../schema';
import { eq, and, isNull } from 'drizzle-orm';

/**
 * Normalizes an item name for consistent matching
 * - Lowercases
 * - Trims whitespace
 * - Removes common suffixes/prefixes
 */
export function normalizeItemName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^\d+\s*x\s*/i, '')
    .replace(/\s*\d+\s*(oz|lb|kg|g|ml|l|ct|pk|pc)\.?$/i, '')
    .trim();
}

/**
 * Gets category for an item, checking in order:
 * 1. User learned items (highest priority - user corrections)
 * 2. Keyword matching (fallback)
 * 3. "Other" category (default if no match)
 *
 * @param itemName - The item name to categorize
 * @param storeId - Optional store ID for store-specific learning
 */
export async function getCategoryForItem(
  itemName: string,
  storeId?: number | null
): Promise<{ categoryId: number; confidence: number; source: 'learned' | 'keyword' | 'default' }> {
  const normalizedName = normalizeItemName(itemName);

  const learnedItems = await db
    .select()
    .from(userLearnedItems)
    .where(eq(userLearnedItems.normalizedName, normalizedName));

  const storeSpecific = storeId ? learnedItems.find((item) => item.storeId === storeId) : null;
  const global = learnedItems.find((item) => item.storeId === null);
  const learned = storeSpecific || global;

  if (learned) {
    const confidence = Math.min(90 + learned.correctionCount * 2, 100);
    return { categoryId: learned.categoryId, confidence, source: 'learned' };
  }

  const allCategories = await db.select().from(categories);

  for (const category of allCategories) {
    const keywords = category.keywords || [];
    if (keywords.some((k) => normalizedName.includes(k.toLowerCase()))) {
      return { categoryId: category.id, confidence: 70, source: 'keyword' };
    }
  }

  const otherCategory = allCategories.find((c) => c.name === 'Other');
  return {
    categoryId: otherCategory?.id || 1,
    confidence: 50,
    source: 'default',
  };
}

/**
 * Records a user category correction for learning
 * If the item-category mapping already exists, increments the correction count
 */
export async function recordUserCorrection(
  itemName: string,
  categoryId: number,
  storeId?: number | null
): Promise<void> {
  const normalizedName = normalizeItemName(itemName);

  const conditions = [eq(userLearnedItems.normalizedName, normalizedName)];
  if (storeId) {
    conditions.push(eq(userLearnedItems.storeId, storeId));
  } else {
    conditions.push(isNull(userLearnedItems.storeId));
  }

  const existing = await db
    .select()
    .from(userLearnedItems)
    .where(and(...conditions))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(userLearnedItems)
      .set({
        categoryId,
        correctionCount: existing[0].correctionCount + 1,
        lastUsedAt: new Date(),
      })
      .where(eq(userLearnedItems.id, existing[0].id));
  } else {
    await db.insert(userLearnedItems).values({
      normalizedName,
      categoryId,
      storeId: storeId || null,
      correctionCount: 1,
    });
  }
}

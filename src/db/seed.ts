import { db } from './client';
import { categories } from './schema';
import { DEFAULT_CATEGORIES } from './categoryDefaults';

/**
 * Inserts the default categories on first launch only.
 *
 * `name` goes in as the canonical English string and stays that way in every
 * language. The UI renders `categoryLabel()` instead.
 */
export async function seedCategories() {
  const existingCategories = await db.select().from(categories).limit(1);

  if (existingCategories.length > 0) {
    return;
  }

  for (const category of DEFAULT_CATEGORIES) {
    await db.insert(categories).values({
      name: category.name,
      icon: category.icon,
      color: category.color,
      keywords: category.keywords,
      isDefault: category.isDefault,
    });
  }
}

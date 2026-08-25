import type { TFunction } from 'i18next';
import { DEFAULT_CATEGORIES } from '@/src/db/categoryDefaults';

/**
 * Category rows store a canonical English `name` — it is the row's identity, not
 * display text. Every surface that shows a category to the user resolves it
 * through here instead of rendering the stored string.
 */
const KEY_BY_NAME = new Map(
  DEFAULT_CATEGORIES.map((category) => [category.name, category.translationKey])
);

/**
 * Translated label for a stored category name.
 *
 * Falls back to the stored name for anything not seeded by us, so a category the
 * user adds later still reads as what they typed rather than a missing key.
 */
export function categoryLabel(name: string | null | undefined, t: TFunction): string {
  if (!name) return t('item.uncategorized');
  const key = KEY_BY_NAME.get(name);
  return key ? t(`categories.${key}`) : name;
}

/** `🥬 Frutas y verduras`, or just the label when the category has no icon. */
export function categoryLabelWithIcon(
  category: { name: string; icon?: string | null } | null | undefined,
  t: TFunction
): string | null {
  if (!category) return null;
  const label = categoryLabel(category.name, t);
  return category.icon ? `${category.icon} ${label}` : label;
}

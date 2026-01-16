import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { categories } from './categories';
import { stores } from './stores';

/**
 * Stores user corrections for item categorization.
 * When a user manually changes an item's category, we record it here
 * so future scans of the same item can use the learned category.
 */
export const userLearnedItems = sqliteTable(
  'user_learned_items',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    normalizedName: text('normalized_name').notNull(),
    categoryId: integer('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
    storeId: integer('store_id').references(() => stores.id, { onDelete: 'set null' }),
    correctionCount: integer('correction_count').notNull().default(1),
    lastUsedAt: integer('last_used_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [uniqueIndex('user_learned_items_unique_idx').on(table.normalizedName, table.storeId)]
);

export type UserLearnedItem = typeof userLearnedItems.$inferSelect;
export type NewUserLearnedItem = typeof userLearnedItems.$inferInsert;

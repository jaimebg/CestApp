import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const stores = sqliteTable('stores', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  normalizedName: text('normalized_name').notNull(),
  logoUrl: text('logo_url'),
  address: text('address'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  syncId: text('sync_id'),
});

export type Store = typeof stores.$inferSelect;
export type NewStore = typeof stores.$inferInsert;

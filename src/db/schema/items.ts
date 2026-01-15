import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { receipts } from './receipts';
import { categories } from './categories';

export const items = sqliteTable('items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  receiptId: integer('receipt_id')
    .notNull()
    .references(() => receipts.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  normalizedName: text('normalized_name'),
  price: integer('price').notNull(), // Stored in cents
  quantity: integer('quantity').default(1),
  unitPrice: integer('unit_price'), // Stored in cents
  unit: text('unit'), // 'kg', 'lb', 'each', etc.
  categoryId: integer('category_id').references(() => categories.id),
  confidence: integer('confidence'), // 0-100
  isManuallyEdited: integer('is_manually_edited', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  syncId: text('sync_id'),
});

export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;

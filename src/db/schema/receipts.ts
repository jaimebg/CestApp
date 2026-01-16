import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { stores } from './stores';

export const receipts = sqliteTable('receipts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  storeId: integer('store_id').references(() => stores.id),
  dateTime: integer('date_time', { mode: 'timestamp' }).notNull(),
  totalAmount: integer('total_amount').notNull(), // Stored in cents
  subtotal: integer('subtotal'), // Stored in cents
  taxAmount: integer('tax_amount'), // Stored in cents
  discountAmount: integer('discount_amount'), // Stored in cents
  paymentMethod: text('payment_method'), // 'cash', 'card', 'digital'
  imagePath: text('image_path'),
  pdfPath: text('pdf_path'),
  rawText: text('raw_text'),
  processingStatus: text('processing_status').notNull().default('pending'), // 'pending' | 'processing' | 'completed' | 'failed' | 'manual_review'
  confidence: integer('confidence'), // 0-100
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  syncId: text('sync_id'),
});

export type Receipt = typeof receipts.$inferSelect;
export type NewReceipt = typeof receipts.$inferInsert;

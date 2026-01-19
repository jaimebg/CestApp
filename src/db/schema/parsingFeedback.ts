import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { stores } from './stores';
import { receipts } from './receipts';

/**
 * Type of field that was corrected
 */
export type FeedbackFieldType =
  | 'item_name'
  | 'item_price'
  | 'item_quantity'
  | 'total'
  | 'subtotal'
  | 'tax'
  | 'date'
  | 'store_name'
  | 'item_added'
  | 'item_removed';

/**
 * Parsing feedback table
 * Stores user corrections to learn from mistakes
 */
export const parsingFeedback = sqliteTable('parsing_feedback', {
  id: integer('id').primaryKey({ autoIncrement: true }),

  // Reference to the receipt (optional, might be deleted)
  receiptId: integer('receipt_id').references(() => receipts.id),

  // Reference to the store (for pattern learning)
  storeId: integer('store_id').references(() => stores.id),

  // What type of field was corrected
  fieldType: text('field_type').$type<FeedbackFieldType>().notNull(),

  // Original value from parser
  originalValue: text('original_value'),

  // User-corrected value
  correctedValue: text('corrected_value'),

  // Item index if applicable (for item corrections)
  itemIndex: integer('item_index'),

  // OCR context - surrounding text that may help identify patterns
  ocrContext: text('ocr_context'),

  // Position in receipt (normalized Y position 0-1)
  positionY: integer('position_y'), // Stored as integer * 1000 for precision

  // Confidence of original parse
  originalConfidence: integer('original_confidence'),

  // Whether this feedback was used for learning
  wasProcessed: integer('was_processed', { mode: 'boolean' }).notNull().default(false),

  // Timestamps
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type ParsingFeedback = typeof parsingFeedback.$inferSelect;
export type NewParsingFeedback = typeof parsingFeedback.$inferInsert;

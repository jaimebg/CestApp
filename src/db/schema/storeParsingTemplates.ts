import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { stores } from './stores';
import type { ZoneDefinition, ParsingHints } from '../../types/zones';
import type { StoreFingerprint } from '../../services/ocr/storeFingerprint';

export type TemplateDimensions = {
  width: number;
  height: number;
};

export const storeParsingTemplates = sqliteTable('store_parsing_templates', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  storeId: integer('store_id')
    .notNull()
    .references(() => stores.id)
    .unique(),
  zones: text('zones', { mode: 'json' }).$type<ZoneDefinition[]>().notNull(),
  parsingHints: text('parsing_hints', { mode: 'json' }).$type<ParsingHints>(),
  sampleImagePath: text('sample_image_path'),
  // Store the original image dimensions when template was created
  templateImageDimensions: text('template_image_dimensions', {
    mode: 'json',
  }).$type<TemplateDimensions>(),
  // Store fingerprint for pattern matching
  fingerprint: text('fingerprint', { mode: 'json' }).$type<StoreFingerprint>(),
  confidence: integer('confidence').notNull().default(50),
  useCount: integer('use_count').notNull().default(0),
  // Track successful vs failed parses for learning
  successCount: integer('success_count').notNull().default(0),
  failureCount: integer('failure_count').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type StoreParsingTemplate = typeof storeParsingTemplates.$inferSelect;
export type NewStoreParsingTemplate = typeof storeParsingTemplates.$inferInsert;

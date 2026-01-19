import { db } from '../client';
import {
  storeParsingTemplates,
  type NewStoreParsingTemplate,
} from '../schema/storeParsingTemplates';
import { parsingFeedback, type NewParsingFeedback } from '../schema/parsingFeedback';
import { stores } from '../schema';
import { eq, sql, and } from 'drizzle-orm';
import type { ZoneDefinition, ParsingHints } from '../../types/zones';
import type { StoreFingerprint } from '../../services/ocr/storeFingerprint';

export async function getTemplateByStoreId(storeId: number) {
  const result = await db
    .select()
    .from(storeParsingTemplates)
    .where(eq(storeParsingTemplates.storeId, storeId))
    .limit(1);
  return result[0] || null;
}

export async function getAllTemplates() {
  return db.select().from(storeParsingTemplates);
}

export async function getAllTemplatesWithStoreNames() {
  const result = await db
    .select({
      id: storeParsingTemplates.id,
      storeId: storeParsingTemplates.storeId,
      storeName: stores.name,
      zones: storeParsingTemplates.zones,
      confidence: storeParsingTemplates.confidence,
      useCount: storeParsingTemplates.useCount,
      createdAt: storeParsingTemplates.createdAt,
      updatedAt: storeParsingTemplates.updatedAt,
    })
    .from(storeParsingTemplates)
    .innerJoin(stores, eq(storeParsingTemplates.storeId, stores.id))
    .orderBy(stores.name);
  return result;
}

export async function upsertStoreTemplate(
  storeId: number,
  data: {
    zones: ZoneDefinition[];
    parsingHints?: ParsingHints;
    sampleImagePath?: string;
    confidence?: number;
    imageDimensions?: { width: number; height: number };
  }
) {
  const existing = await getTemplateByStoreId(storeId);

  if (existing) {
    const result = await db
      .update(storeParsingTemplates)
      .set({
        zones: data.zones,
        parsingHints: data.parsingHints,
        sampleImagePath: data.sampleImagePath,
        templateImageDimensions: data.imageDimensions,
        confidence: data.confidence ?? existing.confidence,
        updatedAt: new Date(),
      })
      .where(eq(storeParsingTemplates.storeId, storeId))
      .returning();
    return result[0];
  }

  const result = await db
    .insert(storeParsingTemplates)
    .values({
      storeId,
      zones: data.zones,
      parsingHints: data.parsingHints,
      sampleImagePath: data.sampleImagePath,
      templateImageDimensions: data.imageDimensions,
      confidence: data.confidence ?? 50,
    })
    .returning();
  return result[0];
}

export async function recordTemplateUsage(storeId: number, wasSuccessful: boolean) {
  const template = await getTemplateByStoreId(storeId);
  if (!template) return null;

  const confidenceAdjustment = wasSuccessful ? 5 : -10;
  const newConfidence = Math.max(0, Math.min(100, template.confidence + confidenceAdjustment));

  const result = await db
    .update(storeParsingTemplates)
    .set({
      useCount: sql`${storeParsingTemplates.useCount} + 1`,
      confidence: newConfidence,
      updatedAt: new Date(),
    })
    .where(eq(storeParsingTemplates.storeId, storeId))
    .returning();
  return result[0];
}

export async function deleteTemplate(storeId: number) {
  await db.delete(storeParsingTemplates).where(eq(storeParsingTemplates.storeId, storeId));
}

export async function createTemplate(data: NewStoreParsingTemplate) {
  const result = await db.insert(storeParsingTemplates).values(data).returning();
  return result[0];
}

// ============================================================
// Learning System Functions
// ============================================================

/**
 * Record parsing feedback for learning
 */
export async function recordParsingFeedback(feedback: NewParsingFeedback) {
  const result = await db.insert(parsingFeedback).values(feedback).returning();
  return result[0];
}

/**
 * Record multiple parsing feedbacks at once
 */
export async function recordBatchFeedback(feedbacks: NewParsingFeedback[]) {
  if (feedbacks.length === 0) return [];
  const result = await db.insert(parsingFeedback).values(feedbacks).returning();
  return result;
}

/**
 * Get unprocessed feedback for a store
 */
export async function getUnprocessedFeedback(storeId: number) {
  return db
    .select()
    .from(parsingFeedback)
    .where(and(eq(parsingFeedback.storeId, storeId), eq(parsingFeedback.wasProcessed, false)));
}

/**
 * Mark feedback as processed
 */
export async function markFeedbackProcessed(feedbackIds: number[]) {
  if (feedbackIds.length === 0) return;

  for (const id of feedbackIds) {
    await db.update(parsingFeedback).set({ wasProcessed: true }).where(eq(parsingFeedback.id, id));
  }
}

/**
 * Update template with fingerprint
 */
export async function updateTemplateFingerprint(storeId: number, fingerprint: StoreFingerprint) {
  const result = await db
    .update(storeParsingTemplates)
    .set({
      fingerprint,
      updatedAt: new Date(),
    })
    .where(eq(storeParsingTemplates.storeId, storeId))
    .returning();
  return result[0];
}

/**
 * Record successful parse (increases confidence)
 */
export async function recordParseSuccess(storeId: number) {
  const template = await getTemplateByStoreId(storeId);
  if (!template) return null;

  const newConfidence = Math.min(100, template.confidence + 2);

  const result = await db
    .update(storeParsingTemplates)
    .set({
      successCount: sql`${storeParsingTemplates.successCount} + 1`,
      useCount: sql`${storeParsingTemplates.useCount} + 1`,
      confidence: newConfidence,
      updatedAt: new Date(),
    })
    .where(eq(storeParsingTemplates.storeId, storeId))
    .returning();
  return result[0];
}

/**
 * Record failed parse (decreases confidence)
 */
export async function recordParseFailure(storeId: number) {
  const template = await getTemplateByStoreId(storeId);
  if (!template) return null;

  const newConfidence = Math.max(0, template.confidence - 5);

  const result = await db
    .update(storeParsingTemplates)
    .set({
      failureCount: sql`${storeParsingTemplates.failureCount} + 1`,
      useCount: sql`${storeParsingTemplates.useCount} + 1`,
      confidence: newConfidence,
      updatedAt: new Date(),
    })
    .where(eq(storeParsingTemplates.storeId, storeId))
    .returning();
  return result[0];
}

/**
 * Get all templates with fingerprints for matching
 */
export async function getTemplatesWithFingerprints() {
  const result = await db
    .select({
      storeId: storeParsingTemplates.storeId,
      storeName: stores.name,
      fingerprint: storeParsingTemplates.fingerprint,
      confidence: storeParsingTemplates.confidence,
    })
    .from(storeParsingTemplates)
    .innerJoin(stores, eq(storeParsingTemplates.storeId, stores.id))
    .where(sql`${storeParsingTemplates.fingerprint} IS NOT NULL`);

  return result;
}

/**
 * Get feedback stats for a store
 */
export async function getFeedbackStats(storeId: number) {
  const feedbacks = await db
    .select()
    .from(parsingFeedback)
    .where(eq(parsingFeedback.storeId, storeId));

  const stats = {
    total: feedbacks.length,
    byFieldType: {} as Record<string, number>,
    processed: feedbacks.filter((f) => f.wasProcessed).length,
    unprocessed: feedbacks.filter((f) => !f.wasProcessed).length,
  };

  for (const f of feedbacks) {
    stats.byFieldType[f.fieldType] = (stats.byFieldType[f.fieldType] || 0) + 1;
  }

  return stats;
}

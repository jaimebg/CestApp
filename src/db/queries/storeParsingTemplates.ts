import { db } from '../client';
import {
  storeParsingTemplates,
  type NewStoreParsingTemplate,
} from '../schema/storeParsingTemplates';
import { stores } from '../schema';
import { eq, sql } from 'drizzle-orm';
import type { ZoneDefinition, ParsingHints } from '../../types/zones';

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

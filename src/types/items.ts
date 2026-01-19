/**
 * Item-related type definitions
 */

import type { Item } from '../db/schema/items';
import type { Category } from '../db/schema/categories';

/**
 * Item with associated category information
 */
export interface ItemWithCategory extends Item {
  category: Category | null;
}

/**
 * Editable item for the review screen
 */
export interface EditableItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  unit: string | null;
  confidence: number;
  categoryId?: number;
}

/**
 * Parsed item from OCR
 */
export interface ParsedItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  unit: string | null;
  confidence: number;
  categoryId?: number;
}

// Re-export base types for convenience
export type { Item, NewItem } from '../db/schema/items';

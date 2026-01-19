/**
 * Category-related type definitions
 */

import type { Category } from '../db/schema/categories';

/**
 * Category with spending total
 */
export interface CategoryWithSpending extends Category {
  totalSpent: number;
  itemCount: number;
}

/**
 * Category option for pickers
 */
export interface CategoryOption {
  id: number;
  name: string;
  icon: string | null;
  color: string | null;
}

// Re-export base types for convenience
export type { Category, NewCategory } from '../db/schema/categories';

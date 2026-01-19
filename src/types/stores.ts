/**
 * Store-related type definitions
 */

import type { Store } from '../db/schema/stores';

/**
 * Store with receipt count
 */
export interface StoreWithReceiptCount extends Store {
  receiptCount: number;
  totalSpent: number;
}

/**
 * Store option for pickers
 */
export interface StoreOption {
  id: number;
  name: string;
  receiptCount?: number;
}

// Re-export base types for convenience
export type { Store, NewStore } from '../db/schema/stores';

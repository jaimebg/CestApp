/**
 * Receipt-related type definitions
 */

import type { Receipt } from '../db/schema/receipts';
import type { Store } from '../db/schema/stores';

/**
 * Receipt with associated store information
 */
export interface ReceiptWithStore {
  receipt: Receipt;
  store: Store | null;
  itemCount: number;
}

/**
 * Processing status of a receipt
 */
export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'manual_review';

/**
 * Payment methods
 */
export type PaymentMethod = 'cash' | 'card' | 'digital' | null;

// Re-export base types for convenience
export type { Receipt } from '../db/schema/receipts';

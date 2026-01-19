/**
 * Receipts store with caching for efficient data fetching
 */

import { create } from 'zustand';
import { getReceiptsWithItemCount } from '../db/queries/receipts';
import type { Receipt } from '../db/schema/receipts';
import type { Store } from '../db/schema/stores';
import { createScopedLogger } from '../utils/debug';

const logger = createScopedLogger('ReceiptsStore');

const CACHE_DURATION_MS = 30000; // 30 seconds

export interface ReceiptWithStore {
  receipt: Receipt;
  store: Store | null;
  itemCount: number;
}

interface ReceiptsState {
  receipts: ReceiptWithStore[];
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;

  // Actions
  fetchReceipts: () => Promise<void>;
  fetchRecentReceipts: (limit?: number) => Promise<ReceiptWithStore[]>;
  addReceipt: (receipt: ReceiptWithStore) => void;
  updateReceipt: (id: number, updates: Partial<ReceiptWithStore>) => void;
  deleteReceipt: (id: number) => void;
  invalidateCache: () => void;

  // Selectors
  getRecentReceipts: (limit?: number) => ReceiptWithStore[];
  getReceiptById: (id: number) => ReceiptWithStore | undefined;
}

export const useReceiptsStore = create<ReceiptsState>()((set, get) => ({
  receipts: [],
  isLoading: false,
  error: null,
  lastFetched: null,

  fetchReceipts: async () => {
    const { lastFetched, isLoading } = get();

    // Check if cache is still valid
    if (lastFetched && Date.now() - lastFetched < CACHE_DURATION_MS) {
      logger.log('Using cached receipts data');
      return;
    }

    // Don't fetch if already loading
    if (isLoading) {
      logger.log('Already fetching receipts, skipping');
      return;
    }

    set({ isLoading: true, error: null });

    try {
      logger.log('Fetching receipts from database');
      const data = await getReceiptsWithItemCount();
      set({
        receipts: data,
        lastFetched: Date.now(),
        isLoading: false,
      });
      logger.log(`Fetched ${data.length} receipts`);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error';
      logger.error('Failed to fetch receipts:', e);
      set({ error: errorMessage, isLoading: false });
    }
  },

  fetchRecentReceipts: async (limit = 5) => {
    await get().fetchReceipts();
    return get().receipts.slice(0, limit);
  },

  addReceipt: (receipt) => {
    set((state) => ({
      receipts: [receipt, ...state.receipts],
    }));
  },

  updateReceipt: (id, updates) => {
    set((state) => ({
      receipts: state.receipts.map((r) => (r.receipt.id === id ? { ...r, ...updates } : r)),
    }));
  },

  deleteReceipt: (id) => {
    set((state) => ({
      receipts: state.receipts.filter((r) => r.receipt.id !== id),
    }));
  },

  invalidateCache: () => {
    logger.log('Invalidating receipts cache');
    set({ lastFetched: null });
  },

  // Selectors
  getRecentReceipts: (limit = 5) => {
    return get().receipts.slice(0, limit);
  },

  getReceiptById: (id) => {
    return get().receipts.find((r) => r.receipt.id === id);
  },
}));

// Selector hooks for optimized re-renders
export const useReceipts = () => useReceiptsStore((s) => s.receipts);
export const useReceiptsLoading = () => useReceiptsStore((s) => s.isLoading);
export const useReceiptsError = () => useReceiptsStore((s) => s.error);

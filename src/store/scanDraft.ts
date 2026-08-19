/**
 * The receipt being scanned, between the capture that produced it and the
 * review screen that reads it.
 *
 * It lives here rather than in navigation params because a capture carries its
 * every recognized block, which is far more than a URL should hold, and
 * because the zone editor has to hand redrawn zones back to a review screen
 * already on the stack.
 */

import { create } from 'zustand';
import type { CaptureSource } from '../services/capture';
import type { OcrBlock } from '../services/ocr';
import type { ZoneDefinition } from '../types/zones';

export interface ScanDraft {
  uri: string;
  source: CaptureSource;
  isPdf: boolean;
  ocrText: string;
  lines: string[];
  blocks: OcrBlock[];
  /** The space the blocks and zones are positioned in. */
  dimensions: { width: number; height: number };
  zones: ZoneDefinition[];
  detectedTotal: number | null;
}

interface ScanDraftState {
  draft: ScanDraft | null;
  setDraft: (draft: ScanDraft) => void;
  setZones: (zones: ZoneDefinition[]) => void;
  reset: () => void;
}

export const useScanDraftStore = create<ScanDraftState>()((set) => ({
  draft: null,
  setDraft: (draft) => set({ draft }),
  setZones: (zones) => set((state) => (state.draft ? { draft: { ...state.draft, zones } } : state)),
  reset: () => set({ draft: null }),
}));

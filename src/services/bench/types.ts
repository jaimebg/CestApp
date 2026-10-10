import type { MlkitText } from '../ocr/imageOcr';

export const BENCH_SCHEMA_VERSION = 1;

export interface BenchDimensions {
  width: number;
  height: number;
}

/**
 * One capture as a development build recorded it: the recognizer's untouched
 * output and the image it read. Everything after the recognizer is worked out
 * again when the benchmark replays it.
 */
export interface BenchRecord {
  schemaVersion: number;
  id: string;
  capturedAt: string;
  platform: string;
  osVersion: string;
  appVersion: string | null;
  source: string | null;
  /** File name of the image copy, next to the record. */
  image: string;
  /** The size the image was read at. */
  knownDimensions: BenchDimensions;
  raw: MlkitText;
}

export interface TruthItem {
  /** As printed on the ticket. */
  name: string;
  quantity?: number;
  /** The line total in euros. */
  totalPrice: number;
}

/** A ticket's real contents, checked by hand against the paper. */
export interface TruthTicket {
  ticket: string;
  /** A chainId from src/config/spanishChains.ts. */
  chain: string;
  /** YYYY-MM-DD. */
  date: string;
  total: number;
  items: TruthItem[];
  /** Ids of the captures of this ticket. */
  captures: string[];
}

/** What a reading said, in a form that compares across captures. */
export interface RecordAnswers {
  store: string | null;
  date: string | null;
  /** In cents. */
  total: number | null;
  /** The line totals in cents, sorted and joined. */
  items: string;
}

export interface RecordScore {
  id: string;
  ticket: string;
  /** Why the replay failed, when it did. */
  error: string | null;
  store: boolean;
  date: boolean;
  total: boolean;
  itemsFound: number;
  itemsMissing: number;
  itemsExtra: number;
  fullyCorrect: boolean;
  answers: RecordAnswers;
}

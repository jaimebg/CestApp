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
  /** A chainId from a template in src/config/countries/. */
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

export interface Metrics {
  captures: number;
  store: number;
  date: number;
  total: number;
  itemRecall: number;
  itemPrecision: number;
  fullyCorrect: number;
  /** Per field, the share of captures agreeing with the most common answer. */
  stability: { store: number; date: number; total: number; items: number };
}

export interface TicketSummary {
  ticket: string;
  metrics: Metrics;
}

export interface BenchReport {
  createdAt: string;
  commit: string;
  tickets: TicketSummary[];
  overall: Metrics;
  records: RecordScore[];
  /** Captures no truth file lists. */
  unassigned: string[];
  /** Captures a truth file lists that were not found. */
  missing: string[];
  /** Capture files that could not be parsed, such as one cut short mid-write. */
  unreadable: UnreadableFile[];
}

export interface BenchFile {
  name: string;
  text: string;
}

export interface UnreadableFile {
  file: string;
  error: string;
}

/** Everything the benchmark reads and writes, so the run itself stays pure. */
export interface BenchIo {
  captureFiles(): BenchFile[];
  truthFiles(): BenchFile[];
  /** The newest report saved before this run, if any. */
  previousReport(): BenchReport | null;
  saveReport(fileName: string, report: BenchReport): void;
}

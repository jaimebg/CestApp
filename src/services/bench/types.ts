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

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import {
  copyAsync,
  documentDirectory,
  getInfoAsync,
  makeDirectoryAsync,
  writeAsStringAsync,
} from 'expo-file-system/legacy';
import { createScopedLogger } from '../../utils/debug';
import type { MlkitText } from '../ocr/imageOcr';
import { BENCH_SCHEMA_VERSION, type BenchDimensions, type BenchRecord } from './types';

const logger = createScopedLogger('Bench');

const BENCH_FOLDER = `${documentDirectory}bench/`;

export interface RecordCaptureInput {
  uri: string;
  raw: MlkitText;
  knownDimensions: BenchDimensions;
  source?: string;
}

export function benchRecordId(date: Date): string {
  return date.toISOString().replace(/[:.]/g, '-');
}

function extensionOf(uri: string): string {
  const match = uri.match(/\.([a-z0-9]+)$/i);
  return match ? match[1].toLowerCase() : 'jpg';
}

/**
 * Saves a capture for the reading benchmark: the recognizer's untouched output
 * and a copy of the image it read. Development builds only. Never throws, so a
 * failure here cannot reach the scan.
 */
export async function recordCapture(
  input: RecordCaptureInput,
  now: Date = new Date()
): Promise<void> {
  try {
    const folder = await getInfoAsync(BENCH_FOLDER);
    if (!folder.exists) {
      await makeDirectoryAsync(BENCH_FOLDER, { intermediates: true });
    }

    const id = benchRecordId(now);
    const image = `${id}.${extensionOf(input.uri)}`;
    await copyAsync({ from: input.uri, to: `${BENCH_FOLDER}${image}` });

    const record: BenchRecord = {
      schemaVersion: BENCH_SCHEMA_VERSION,
      id,
      capturedAt: now.toISOString(),
      platform: Platform.OS,
      osVersion: String(Platform.Version),
      appVersion: Constants.expoConfig?.version ?? null,
      source: input.source ?? null,
      image,
      knownDimensions: input.knownDimensions,
      raw: input.raw,
    };
    await writeAsStringAsync(`${BENCH_FOLDER}${id}.json`, JSON.stringify(record));
    logger.log('Recorded capture', id);
  } catch (error) {
    logger.warn('Could not record the capture:', error);
  }
}

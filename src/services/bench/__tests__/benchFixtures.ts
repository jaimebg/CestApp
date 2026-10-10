import { MERCADONA_PHOTO_BLOCKS } from '../../ocr/__tests__/fixtures.mercadonaPhoto';
import { toMlkitText } from '../../ocr/__tests__/mlkitFixture';
import type { BenchIo, BenchRecord, BenchReport, RecordScore, TruthTicket } from '../types';

export const MERCADONA_TRUTH: TruthTicket = {
  ticket: 'mercadona-photo',
  chain: 'mercadona',
  date: '2026-08-11',
  total: 28.58,
  items: [
    { name: 'BEBIDA AVENA', totalPrice: 1.0 },
    { name: 'ZUMO NARANJA C/PULPA', quantity: 2, totalPrice: 3.5 },
    { name: 'TORTITA LEGUMBRE 44%', totalPrice: 1.75 },
    { name: 'ESCALOPIN SALMÓN', totalPrice: 7.8 },
    { name: 'PECHUGA PAVO 92%', quantity: 2, totalPrice: 5.7 },
    { name: '100% INTEGRAL FINO', totalPrice: 1.5 },
    { name: 'QUESO COTTAGE', quantity: 3, totalPrice: 4.05 },
    { name: 'CREMA COTTAGE', totalPrice: 1.5 },
    { name: 'PLATANO', totalPrice: 1.78 },
  ],
  captures: ['m1', 'm2'],
};

export function mercadonaRecord(id: string): BenchRecord {
  return {
    schemaVersion: 1,
    id,
    capturedAt: '2026-08-11T09:30:00.000Z',
    platform: 'ios',
    osVersion: '26.0',
    appVersion: '1.0.0',
    source: 'scanner',
    image: `${id}.jpg`,
    knownDimensions: { width: 612, height: 1122 },
    raw: toMlkitText(MERCADONA_PHOTO_BLOCKS),
  };
}

export function score(overrides: Partial<RecordScore> = {}): RecordScore {
  return {
    id: 'r',
    ticket: 't',
    error: null,
    store: true,
    date: true,
    total: true,
    itemsFound: 2,
    itemsMissing: 0,
    itemsExtra: 0,
    fullyCorrect: true,
    answers: { store: 'mercadona', date: '2026-08-11', total: 450, items: '100,350' },
    ...overrides,
  };
}

export function fakeIo(
  captures: BenchRecord[],
  truths: TruthTicket[],
  previous: BenchReport | null = null
) {
  const saved: { fileName: string; report: BenchReport }[] = [];
  const io: BenchIo = {
    captures: () => captures,
    truths: () => truths,
    previousReport: () => previous,
    saveReport: (fileName, report) => {
      saved.push({ fileName, report });
    },
  };
  return { io, saved };
}

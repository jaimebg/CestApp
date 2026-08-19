import { parseCapture } from '../parseCapture';
import { autoDetectZones } from '../autoZoneDetector';
import { MERCADONA_PHOTO_BLOCKS } from './fixtures.mercadonaPhoto';
import type { ZoneDefinition } from '../../../types/zones';

const PHOTO_DIMS = { width: 612, height: 1122 };

const TEXT_ONLY_LINES = [
  'SUPERMERCADO LOPEZ',
  'CALLE FALSA 123, MADRID',
  '12/01/2026 10:30',
  'LECHE 1,10',
  'PAN 0,85',
  'TOTAL 1,95',
];

const UNTOTALLED_LINES = [
  'SUPERMERCADO LOPEZ',
  'CALLE FALSA 123, MADRID',
  '12/01/2026 10:30',
  'LECHE 1,10',
  'PAN 0,85',
];

function zonesForPhoto(): ZoneDefinition[] {
  return autoDetectZones(MERCADONA_PHOTO_BLOCKS, PHOTO_DIMS).zones;
}

describe('parseCapture', () => {
  it('returns nothing when the capture yielded no text', () => {
    const result = parseCapture({
      lines: [],
      blocks: [],
      ocrText: '',
      dimensions: PHOTO_DIMS,
      zones: [],
      detectedTotal: null,
    });

    expect(result).toBeNull();
  });

  it('reads the items out of the zones when the capture has them', () => {
    const result = parseCapture({
      lines: MERCADONA_PHOTO_BLOCKS.map((b) => b.text),
      blocks: MERCADONA_PHOTO_BLOCKS,
      ocrText: MERCADONA_PHOTO_BLOCKS.map((b) => b.text).join('\n'),
      dimensions: PHOTO_DIMS,
      zones: zonesForPhoto(),
      detectedTotal: null,
    });

    expect(result).not.toBeNull();
    expect(result!.items).toHaveLength(9);
    expect(result!.items.reduce((sum, item) => sum + item.totalPrice, 0)).toBeCloseTo(28.58, 2);
  });

  it('reads a photographed receipt without zones from the block geometry', () => {
    const result = parseCapture({
      lines: MERCADONA_PHOTO_BLOCKS.map((b) => b.text),
      blocks: MERCADONA_PHOTO_BLOCKS,
      ocrText: MERCADONA_PHOTO_BLOCKS.map((b) => b.text).join('\n'),
      dimensions: PHOTO_DIMS,
      zones: [],
      detectedTotal: null,
    });

    expect(result).not.toBeNull();
    expect(result!.items.reduce((sum, item) => sum + item.totalPrice, 0)).toBeCloseTo(28.58, 2);
  });

  it('falls back to plain text parsing when there is no geometry', () => {
    const result = parseCapture({
      lines: TEXT_ONLY_LINES,
      blocks: [],
      ocrText: TEXT_ONLY_LINES.join('\n'),
      dimensions: { width: 0, height: 0 },
      zones: [],
      detectedTotal: null,
    });

    expect(result).not.toBeNull();
    expect(result!.total).toBeCloseTo(1.95, 2);
    expect(result!.items).toHaveLength(2);
  });

  it('takes the detected total when the parse found none', () => {
    const result = parseCapture({
      lines: UNTOTALLED_LINES,
      blocks: [],
      ocrText: UNTOTALLED_LINES.join('\n'),
      dimensions: { width: 0, height: 0 },
      zones: [],
      detectedTotal: 1.95,
    });

    expect(result!.total).toBeCloseTo(1.95, 2);
  });

  it('keeps the parsed total when it sits closer to the item sum', () => {
    const result = parseCapture({
      lines: TEXT_ONLY_LINES,
      blocks: [],
      ocrText: TEXT_ONLY_LINES.join('\n'),
      dimensions: { width: 0, height: 0 },
      zones: [],
      detectedTotal: 2.5,
    });

    expect(result!.total).toBeCloseTo(1.95, 2);
  });
});

import { autoDetectZones } from '../autoZoneDetector';
import { applyOrigin } from '../origin';
import { parseCapture } from '../parseCapture';
import { createManualParsedReceipt } from '../parser';
import { MERCADONA_PHOTO_BLOCKS } from './fixtures.mercadonaPhoto';

const PHOTO_DIMS = { width: 612, height: 1122 };
const blank = createManualParsedReceipt(new Date(2026, 9, 15));

test('stamps ES/EUR on the Mercadona photo fixture', () => {
  const parsed = parseCapture({
    lines: MERCADONA_PHOTO_BLOCKS.map((b) => b.text),
    blocks: MERCADONA_PHOTO_BLOCKS,
    ocrText: MERCADONA_PHOTO_BLOCKS.map((b) => b.text).join('\n'),
    dimensions: PHOTO_DIMS,
    zones: autoDetectZones(MERCADONA_PHOTO_BLOCKS, PHOTO_DIMS).zones,
    detectedTotal: null,
  });
  expect(parsed).toMatchObject({ countryCode: 'ES', currency: 'EUR' });
});

test('a chain’s country wins over text signals', () => {
  expect(
    applyOrigin({ ...blank, chainId: 'mercadona', countryCode: 'ES' }, 'OBRIGADO')
  ).toMatchObject({ countryCode: 'ES' });
});

test('a pound receipt with no country signals is in pounds', () => {
  expect(applyOrigin(blank, 'TESCO\nTOTAL £12.40').currency).toBe('GBP');
});

test('a detected country keeps its own currency', () => {
  expect(applyOrigin(blank, 'ATCUD:AB-1\nTOTAL 3,00 €')).toMatchObject({
    countryCode: 'PT',
    currency: 'EUR',
  });
});

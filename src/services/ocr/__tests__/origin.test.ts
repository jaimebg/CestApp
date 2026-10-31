import { autoDetectZones } from '../autoZoneDetector';
import { parseFiscalQr } from '../../fiscal';
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

const PT_QR =
  'A:502011475*B:999999990*C:PT*D:FS*E:N*F:20261015*G:FS 1/123*H:JJ3ZKXYZ-123*I1:PT*I7:10.00*I8:2.30*N:2.30*O:12.30*Q:AbCd*R:1234';

test('fiscal data overrides the reading', () => {
  expect(
    applyOrigin({ ...blank, total: 12.0 }, 'TOTAL 12,00', parseFiscalQr([PT_QR]))
  ).toMatchObject({
    countryCode: 'PT',
    currency: 'EUR',
    total: 12.3,
    date: new Date(2026, 9, 15),
  });
});

test('no fiscal data leaves the reading as it was', () => {
  expect(applyOrigin({ ...blank, total: 12.0 }, 'TOTAL 12,00', null).total).toBe(12);
});

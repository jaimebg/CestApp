import { detectRegionFromText } from '../../../config/regionalPresets';
import { detectCountry } from '../countryDetector';

test('defaults to Spain with no signals', () => {
  expect(detectCountry('PAN 1,20\nTOTAL 1,20 €')).toEqual({
    code: 'ES',
    confidence: 50,
    method: 'default',
  });
});

test('keeps Spain for a Spanish CIF', () => {
  expect(detectCountry('MERCADONA S.A.\nNIF: A-46103834\nIVA 10%\nTOTAL 12,30').code).toBe('ES');
});

test('prefers Portugal when ATCUD is printed', () => {
  expect(detectCountry('IVA 23%\nTOTAL 12,30\nATCUD:JJ3ZKXYZ-123').code).toBe('PT');
});

test('detects Portugal from a NIF', () => {
  expect(detectCountry('CONTINENTE\nNIF: 502011475\nTOTAL 5,00')).toMatchObject({
    code: 'PT',
    method: 'tax_id',
  });
});

test('detects Austria from a UID', () => {
  expect(detectCountry('BILLA AG\nUID ATU12345678\nSUMME EUR 9,99').code).toBe('AT');
});

test('the zone and spatial parsers get the detected country', () => {
  expect(detectRegionFromText('SUMME EUR 9,99\nUID ATU12345678').id).toBe('austria');
  expect(detectRegionFromText('TOTAL 9,99 €').id).toBe('spain');
});

test('reports how Spain was recognised when it wins alone', () => {
  expect(detectCountry('NIF: A-46103834').method).toBe('tax_id');
});

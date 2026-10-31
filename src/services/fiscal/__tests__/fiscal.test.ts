import { parseAustriaQr } from '../austria';
import { parseFiscalQr } from '../index';
import { parsePortugalQr } from '../portugal';

const PT =
  'A:502011475*B:999999990*C:PT*D:FS*E:N*F:20261015*G:FS 1/123*H:JJ3ZKXYZ-123*I1:PT*I7:10.00*I8:2.30*N:2.30*O:12.30*Q:AbCd*R:1234';
const AT =
  '_R1-AT1_KASSE-01_83469_2026-10-15T18:42:07_7,50_2,00_0,00_0,00_0,00_dGVzdA==_1a2b3c_c2ln_c2lnbmF0dXJl';

test('reads a Portuguese ATCUD QR', () => {
  expect(parsePortugalQr(PT)).toEqual({
    source: 'pt-atcud',
    countryCode: 'PT',
    total: 12.3,
    date: new Date(2026, 9, 15),
    time: null,
    merchantTaxId: '502011475',
  });
});

test('reads an Austrian RKSV QR', () => {
  expect(parseAustriaQr(AT)).toMatchObject({
    source: 'at-rksv',
    countryCode: 'AT',
    total: 9.5,
    date: new Date(2026, 9, 15),
    time: '18:42',
    merchantTaxId: null,
  });
});

test('ignores a loyalty URL', () => {
  expect(parseFiscalQr(['https://club.example.com/u/123'])).toBeNull();
});

test('rejects a truncated ATCUD payload', () => {
  expect(parsePortugalQr('A:502011475*F:2026')).toBeNull();
});

test('rejects an Austrian payload missing its amounts', () => {
  expect(parseAustriaQr('_R1-AT1_KASSE-01_83469_2026-10-15T18:42:07')).toBeNull();
});

test('takes the first payload any parser accepts', () => {
  expect(parseFiscalQr(['https://club.example.com', AT, PT])?.source).toBe('at-rksv');
});

test('rejects an Austrian date that does not exist', () => {
  expect(
    parseAustriaQr('_R1-AT1_KASSE-01_83469_2026-13-45T18:42:07_7,50_2,00_0,00_0,00_0,00_x_y_z')
  ).toBeNull();
});

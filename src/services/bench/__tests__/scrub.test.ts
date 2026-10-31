import type { MlkitText } from '../../ocr/imageOcr';
import { scrubLine, scrubRaw } from '../scrub';

const frame = { left: 0, top: 0, right: 10, bottom: 10 };

function toMlkitTextWithElements(blocks: string[][]): MlkitText {
  return {
    text: blocks.map((lines) => lines.join('\n')).join('\n'),
    blocks: blocks.map((lines) => ({
      text: lines.join('\n'),
      frame,
      recognizedLanguages: [],
      lines: lines.map((line) => ({
        text: line,
        frame,
        recognizedLanguages: [],
        elements: line.split(/\s+/).map((word) => ({ text: word, frame })),
      })),
    })),
  } as unknown as MlkitText;
}

test('masks a Luhn-valid card number', () => {
  expect(scrubLine('VISA 4111 1111 1111 1111')).toBe('VISA **** **** **** ****');
});

test('leaves a non-card barcode', () => {
  expect(scrubLine('8412345678905')).toBe('8412345678905');
});

test('masks a printed card ending', () => {
  expect(scrubLine('TARJ ************1234')).toBe('TARJ ****************');
});

test('masks authorization codes', () => {
  expect(scrubLine('AUT: 0A12B3')).toBe('AUT: ******');
});

test('leaves product names that start like a keyword', () => {
  expect(scrubLine('REFRESCO COLA 1,50')).toBe('REFRESCO COLA 1,50');
});

test('replaces times', () => {
  expect(scrubLine('15/10/2026 18:42:07')).toBe('15/10/2026 12:00:00');
  expect(scrubLine('HORA 9:05')).toBe('HORA 12:00');
});

test('keeps prices and totals', () => {
  expect(scrubLine('TOTAL 23,45')).toBe('TOTAL 23,45');
});

test('is idempotent', () => {
  for (const s of ['VISA 4111 1111 1111 1111', 'AUT: 0A12B3', '18:42', 'TARJ ************1234']) {
    expect(scrubLine(scrubLine(s))).toBe(scrubLine(s));
  }
});

test('scrubs elements and rebuilds block text', () => {
  const out = scrubRaw(toMlkitTextWithElements([['AUT: 0A12B3', 'TOTAL 23,45']]));
  expect(out.blocks[0].text).toBe('AUT: ******\nTOTAL 23,45');
  expect(out.blocks[0].lines[0].elements.map((e) => e.text)).toEqual(['AUT:', '******']);
  expect(out.text).toBe('AUT: ******\nTOTAL 23,45');
});

test('masks card endings after dots and times written with h', () => {
  expect(scrubLine('TARJETA ....4921')).toBe('TARJETA ********');
  expect(scrubLine('HORA 18h42')).toBe('HORA 12h00');
});

test('masks a code ML Kit put in another block on the same row', () => {
  const raw = toMlkitTextWithElements([['AUT:'], ['0A12B3'], ['TOTAL 23,45']]);
  raw.blocks[0].lines[0].frame = { left: 0, top: 100, right: 60, bottom: 120 } as never;
  raw.blocks[1].lines[0].frame = { left: 200, top: 102, right: 300, bottom: 121 } as never;
  raw.blocks[2].lines[0].frame = { left: 0, top: 200, right: 300, bottom: 220 } as never;
  const out = scrubRaw(raw);
  expect(out.blocks[1].lines[0].text).toBe('******');
  expect(out.blocks[1].lines[0].elements.map((e) => e.text)).toEqual(['******']);
  expect(out.blocks[2].lines[0].text).toBe('TOTAL 23,45');
});

test('masks letters too when elements cannot be matched to the scrubbed line', () => {
  const raw = toMlkitTextWithElements([['AUT: 0A12B3']]);
  raw.blocks[0].lines[0].elements = [{ text: 'AUT:0A12B3', frame } as never];
  expect(scrubRaw(raw).blocks[0].lines[0].elements.map((e) => e.text)).toEqual(['AUT:******']);
});

import { detectImageZones, toOcrResult, type MlkitText } from '../imageOcr';
import { MERCADONA_PHOTO_BLOCKS } from './fixtures.mercadonaPhoto';
import { toMlkitText } from './mlkitFixture';

function rawLine(text: string, left: number, top: number, width = 100, height = 20) {
  const frame = { left, top, right: left + width, bottom: top + height };
  return { text, frame, recognizedLanguages: [], elements: [] };
}

function rawBlock(lines: ReturnType<typeof rawLine>[]) {
  const frame = {
    left: Math.min(...lines.map((l) => l.frame.left)),
    top: Math.min(...lines.map((l) => l.frame.top)),
    right: Math.max(...lines.map((l) => l.frame.right)),
    bottom: Math.max(...lines.map((l) => l.frame.bottom)),
  };
  return { text: lines.map((l) => l.text).join('\n'), frame, recognizedLanguages: [], lines };
}

describe('toOcrResult', () => {
  it('turns frames into boxes the size of the frame', () => {
    const raw: MlkitText = { text: 'PAN', blocks: [rawBlock([rawLine('PAN', 10, 20, 100, 40)])] };

    const result = toOcrResult(raw);

    expect(result.blocks[0].boundingBox).toEqual({ left: 10, top: 20, width: 100, height: 40 });
    expect(result.blocks[0].lines[0].boundingBox).toEqual({
      left: 10,
      top: 20,
      width: 100,
      height: 40,
    });
  });

  it('rebuilds the printed rows from the geometry', () => {
    const raw: MlkitText = {
      text: '2 ZUMO NARANJA\n1,75',
      blocks: [
        rawBlock([rawLine('2 ZUMO NARANJA', 60, 400)]),
        rawBlock([rawLine('1,75', 420, 400)]),
      ],
    };

    expect(toOcrResult(raw).lines).toEqual(['2 ZUMO NARANJA 1,75']);
  });

  it('uses the known dimensions when given', () => {
    const raw: MlkitText = { text: 'PAN', blocks: [rawBlock([rawLine('PAN', 10, 20)])] };

    expect(toOcrResult(raw, { width: 612, height: 1122 }).inferredDimensions).toEqual({
      width: 612,
      height: 1122,
    });
  });

  it('infers dimensions 2% beyond the furthest text when none are known', () => {
    const raw: MlkitText = {
      text: 'PAN',
      blocks: [rawBlock([rawLine('PAN', 400, 980, 100, 20)])],
    };

    expect(toOcrResult(raw).inferredDimensions).toEqual({ width: 510, height: 1020 });
  });

  it('keeps the untouched result', () => {
    const raw: MlkitText = { text: 'PAN', blocks: [rawBlock([rawLine('PAN', 10, 20)])] };

    expect(toOcrResult(raw).raw).toBe(raw);
  });
});

describe('detectImageZones', () => {
  it('finds the zones and printed total in the geometry the recognizer reported', () => {
    const ocr = toOcrResult(toMlkitText(MERCADONA_PHOTO_BLOCKS), { width: 612, height: 1122 });

    const result = detectImageZones(ocr, { width: 1, height: 1 });

    expect(result.dimensions).toEqual({ width: 612, height: 1122 });
    expect(result.zones.length).toBeGreaterThan(0);
    expect(result.detectedTotal).toBeCloseTo(28.58, 2);
  });

  it('falls back to the measured size when the recognizer reported none', () => {
    const ocr = toOcrResult({ text: '', blocks: [] });

    expect(detectImageZones(ocr, { width: 300, height: 600 }).dimensions).toEqual({
      width: 300,
      height: 600,
    });
  });
});

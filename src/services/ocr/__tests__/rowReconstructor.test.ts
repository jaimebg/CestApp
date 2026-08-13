import { reconstructRows } from '../rowReconstructor';
import type { OcrBlock } from '../index';

function line(text: string, left: number, top: number, width = 100, height = 20) {
  return { text, boundingBox: { left, top, width, height } };
}

function block(lines: ReturnType<typeof line>[]): OcrBlock {
  const left = Math.min(...lines.map((l) => l.boundingBox.left));
  const top = Math.min(...lines.map((l) => l.boundingBox.top));
  const right = Math.max(...lines.map((l) => l.boundingBox.left + l.boundingBox.width));
  const bottom = Math.max(...lines.map((l) => l.boundingBox.top + l.boundingBox.height));
  return {
    text: lines.map((l) => l.text).join('\n'),
    lines,
    boundingBox: { left, top, width: right - left, height: bottom - top },
  };
}

describe('reconstructRows', () => {
  it('joins columns that share a row, left to right', () => {
    const rows = reconstructRows([
      block([line('2 ZUMO NARANJA', 60, 400), line('1 CREMA COTTAGE', 60, 440)]),
      block([line('1,75', 420, 400)]),
      block([line('3,50', 540, 400), line('1,50', 540, 440)]),
    ]);

    expect(rows).toEqual(['2 ZUMO NARANJA 1,75 3,50', '1 CREMA COTTAGE 1,50']);
  });

  it('leaves single-column receipts untouched', () => {
    const rows = reconstructRows([
      block([line('LECHE ENTERA 0,98', 40, 100), line('PAN INTEGRAL 1,20', 40, 130)]),
    ]);

    expect(rows).toEqual(['LECHE ENTERA 0,98', 'PAN INTEGRAL 1,20']);
  });

  it('orders rows top to bottom regardless of block order', () => {
    const rows = reconstructRows([
      block([line('FOOTER', 40, 900)]),
      block([line('HEADER', 40, 100)]),
    ]);

    expect(rows).toEqual(['HEADER', 'FOOTER']);
  });

  it('tolerates the slight vertical skew of a hand-held photo', () => {
    const rows = reconstructRows([
      block([line('QUESO COTTAGE', 60, 400, 200, 20)]),
      block([line('4,05', 540, 407, 40, 20)]),
    ]);

    expect(rows).toEqual(['QUESO COTTAGE 4,05']);
  });

  it('keeps adjacent rows separate', () => {
    const rows = reconstructRows([
      block([line('ITEM A', 60, 400, 100, 20)]),
      block([line('ITEM B', 60, 425, 100, 20)]),
    ]);

    expect(rows).toEqual(['ITEM A', 'ITEM B']);
  });

  it('ignores blank lines and empty input', () => {
    expect(reconstructRows([])).toEqual([]);
    expect(reconstructRows([block([line('  ', 40, 100), line('REAL', 40, 130)])])).toEqual([
      'REAL',
    ]);
  });
});

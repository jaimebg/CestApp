import { findReceiptRegion } from '../receiptRegion';
import { MERCADONA_PHOTO_BLOCKS } from './fixtures.mercadonaPhoto';
import type { OcrBlock } from '../index';

function block(text: string, left: number, top: number, width = 200, height = 24): OcrBlock {
  return {
    text,
    lines: [{ text, boundingBox: { left, top, width, height } }],
    boundingBox: { left, top, width, height },
  };
}

/** A minimal receipt: a header, three priced rows in a right-aligned column, a total. */
function receiptBlocks(): OcrBlock[] {
  return [
    block('SUPERMERCADO LA DESPENSA S.A.', 100, 200, 400),
    block('Pan de molde integral', 100, 260, 300),
    block('1,15', 700, 260, 80),
    block('Leche entera 1L', 100, 300, 300),
    block('0,98', 700, 300, 80),
    block('Tomate triturado', 100, 340, 300),
    block('1,05', 700, 340, 80),
    block('TOTAL 3,18', 100, 400, 400),
  ];
}

describe('findReceiptRegion', () => {
  it('drops window chrome captured above the receipt', () => {
    const chrome = block('Abrir con Vista Previa', 380, 8, 260);
    const region = findReceiptRegion([chrome, ...receiptBlocks()]);

    expect(region).not.toBeNull();
    expect(region!.blocks).toHaveLength(receiptBlocks().length);
    expect(region!.blocks.map((b) => b.text)).not.toContain('Abrir con Vista Previa');
  });

  it('keeps a store header separated from the body by whitespace', () => {
    const region = findReceiptRegion(receiptBlocks());
    expect(region!.blocks.map((b) => b.text)).toContain('SUPERMERCADO LA DESPENSA S.A.');
  });

  it('anchors on a recognised chain when one is present', () => {
    const blocks = [block('MERCADONA, S.A. A-46103834', 100, 100, 400), ...receiptBlocks()];
    expect(findReceiptRegion(blocks)!.anchor).toBe('chain');
  });

  it('anchors on the total when no chain is recognised', () => {
    expect(findReceiptRegion(receiptBlocks())!.anchor).toBe('total');
  });

  it('anchors on a price column when there is no total line', () => {
    const noTotal = receiptBlocks().filter((b) => !b.text.startsWith('TOTAL'));
    expect(findReceiptRegion(noTotal)!.anchor).toBe('priceColumn');
  });

  it('refuses an image with no anchor and no prices', () => {
    const chromeOnly = [
      block('Abrir con Vista Previa', 380, 8, 260),
      block('Archivo  Edición  Ver', 20, 8, 300),
    ];
    expect(findReceiptRegion(chromeOnly)).toBeNull();
  });

  it('does not refuse when prices exist but nothing anchors', () => {
    // Skewed photo: prices present, right edges scattered, no total keyword.
    const scattered = [
      block('1,15', 700, 200, 80),
      block('0,98', 640, 250, 80),
      block('1,05', 760, 300, 80),
    ];
    const region = findReceiptRegion(scattered);
    expect(region).not.toBeNull();
    expect(region!.anchor).toBe('none');
    expect(region!.kept).toBe(1);
  });

  it('reports the share of blocks kept', () => {
    const chrome = block('Abrir con Vista Previa', 380, 8, 260);
    const all = [chrome, ...receiptBlocks()];
    const region = findReceiptRegion(all);
    expect(region!.kept).toBeCloseTo(receiptBlocks().length / all.length, 5);
  });

  it('returns bounds covering the kept blocks', () => {
    const region = findReceiptRegion(receiptBlocks())!;
    expect(region.bounds.left).toBe(100);
    expect(region.bounds.top).toBe(200);
    expect(region.bounds.left + region.bounds.width).toBe(780);
  });

  it('returns null for no blocks at all', () => {
    expect(findReceiptRegion([])).toBeNull();
  });

  /**
   * The main regression risk is a filter that quietly eats good receipts, so
   * every real fixture must come back essentially whole.
   */
  it('keeps essentially all of a real Mercadona photo', () => {
    const region = findReceiptRegion(MERCADONA_PHOTO_BLOCKS);
    expect(region).not.toBeNull();
    expect(region!.kept).toBeGreaterThan(0.9);
  });
});

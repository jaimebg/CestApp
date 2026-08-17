import { extractTextFromPdf } from '../index';

jest.mock('expo-file-system/legacy', () => ({
  // The test passes the raw PDF body as the "uri" and this stands in for the
  // file read, so the assertions exercise the real base64 -> bytes path.
  readAsStringAsync: async (uri: string) =>
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('buffer').Buffer.from(uri, 'latin1').toString('base64'),
}));

function pdfWithContentStream(content: string): string {
  return [
    '%PDF-1.4',
    '1 0 obj',
    '<< /Type /Page >>',
    'endobj',
    '2 0 obj',
    `<< /Length ${content.length} >>`,
    'stream',
    content,
    'endstream',
    'endobj',
    '%%EOF',
  ].join('\n');
}

function textBlock(x: number, y: number, text: string): string {
  return ['BT', '/F1 10 Tf', `1 0 0 1 ${x} ${y} Tm`, `(${text}) Tj`, 'ET'].join('\n');
}

describe('PDF row reconstruction', () => {
  it('joins text runs that share a baseline into a single line', async () => {
    const content = [
      textBlock(50, 700, '1'),
      textBlock(80, 700, 'HELADOS NARANJA'),
      textBlock(500, 700, '2,40'),
      textBlock(50, 675, '3'),
      textBlock(80, 675, 'QUESO COTTAGE'),
      textBlock(400, 675, '1,35'),
      textBlock(500, 675, '4,05'),
      textBlock(50, 650, 'TOTAL'),
      textBlock(500, 650, '54,20'),
    ].join('\n');

    const result = await extractTextFromPdf(pdfWithContentStream(content));

    expect(result.success).toBe(true);
    expect(result.lines).toEqual([
      '1 HELADOS NARANJA 2,40',
      '3 QUESO COTTAGE 1,35 4,05',
      'TOTAL 54,20',
    ]);
  });

  it('orders columns left to right regardless of drawing order', async () => {
    const content = [
      textBlock(500, 700, '2,40'),
      textBlock(50, 700, '1'),
      textBlock(80, 700, 'HELADOS NARANJA'),
    ].join('\n');

    const result = await extractTextFromPdf(pdfWithContentStream(content));

    expect(result.lines).toEqual(['1 HELADOS NARANJA 2,40']);
  });

  it('orders rows top to bottom in PDF user space', async () => {
    const content = [
      textBlock(50, 600, 'THIRD'),
      textBlock(50, 700, 'FIRST'),
      textBlock(50, 650, 'SECOND'),
    ].join('\n');

    const result = await extractTextFromPdf(pdfWithContentStream(content));

    expect(result.lines).toEqual(['FIRST', 'SECOND', 'THIRD']);
  });

  it('tracks Td, TD and T* positioning inside a single text block', async () => {
    const content = [
      'BT',
      '/F1 10 Tf',
      '1 0 0 1 50 700 Tm',
      '(1) Tj',
      '30 0 Td',
      '(MEDALLON MERLUZA) Tj',
      '420 0 Td',
      '(4,00) Tj',
      '-450 -25 TD',
      '(2) Tj',
      '30 0 Td',
      '(PECHUGA PAVO) Tj',
      'ET',
    ].join('\n');

    const result = await extractTextFromPdf(pdfWithContentStream(content));

    expect(result.lines).toEqual(['1 MEDALLON MERLUZA 4,00', '2 PECHUGA PAVO']);
  });

  it('keeps kerned fragments of one run glued together', async () => {
    const content = [
      'BT',
      '/F1 10 Tf',
      '1 0 0 1 50 700 Tm',
      '[(AT) -30 (UN CLARO)] TJ',
      '1 0 0 1 500 700 Tm',
      '(4,75) Tj',
      'ET',
    ].join('\n');

    const result = await extractTextFromPdf(pdfWithContentStream(content));

    expect(result.lines).toEqual(['ATUN CLARO 4,75']);
  });

  it('leaves single-column receipts one line per row', async () => {
    const content = [
      textBlock(50, 700, 'MERCADONA, S.A. A-46103834'),
      textBlock(50, 680, '17/08/2026 09:32'),
    ].join('\n');

    const result = await extractTextFromPdf(pdfWithContentStream(content));

    expect(result.lines).toEqual(['MERCADONA, S.A. A-46103834', '17/08/2026 09:32']);
  });
});

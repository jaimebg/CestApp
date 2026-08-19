import { extractTextFromPdf } from '../index';

jest.mock('expo-file-system/legacy', () => ({
  readAsStringAsync: async (uri: string) =>
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('buffer').Buffer.from(uri, 'latin1').toString('base64'),
}));

interface FontSpec {
  /** Resource name the content stream selects with Tf. */
  name: string;
  encoding?: string;
  /** Byte -> replacement pairs written into a ToUnicode CMap. */
  toUnicode?: [number, string][];
}

function cmap(pairs: [number, string][]): string {
  const entries = pairs
    .map(([code, char]) => {
      const to = char.charCodeAt(0).toString(16).padStart(4, '0');
      return `<${code.toString(16).padStart(4, '0')}> <${to}>`;
    })
    .join('\n');
  return [
    '/CIDInit /ProcSet findresource begin',
    `${pairs.length} beginbfchar`,
    entries,
    'endbfchar',
    'end',
  ].join('\n');
}

function buildPdf(content: string, fonts: FontSpec[] = [{ name: 'F1' }]): string {
  const objects: string[] = [];
  const fontRefs: string[] = [];

  fonts.forEach((font, index) => {
    const fontId = 10 + index * 2;
    const cmapId = fontId + 1;
    const parts = ['/Type /Font', '/Subtype /TrueType', '/BaseFont /Test'];
    if (font.encoding) parts.push(`/Encoding /${font.encoding}`);
    if (font.toUnicode) parts.push(`/ToUnicode ${cmapId} 0 R`);
    objects.push(`${fontId} 0 obj\n<< ${parts.join(' ')} >>\nendobj`);
    if (font.toUnicode) {
      const body = cmap(font.toUnicode);
      objects.push(
        `${cmapId} 0 obj\n<< /Length ${body.length} >>\nstream\n${body}\nendstream\nendobj`
      );
    }
    fontRefs.push(`/${font.name} ${fontId} 0 R`);
  });

  return [
    '%PDF-1.4',
    '1 0 obj',
    '<< /Type /Page /Parent 2 0 R /Resources 4 0 R /Contents 3 0 R >>',
    'endobj',
    '2 0 obj',
    '<< /Type /Pages /Kids [ 1 0 R ] /Count 1 >>',
    'endobj',
    '4 0 obj',
    `<< /ProcSet [ /PDF /Text ] /Font << ${fontRefs.join(' ')} >> >>`,
    'endobj',
    '3 0 obj',
    `<< /Length ${content.length} >>`,
    'stream',
    content,
    'endstream',
    'endobj',
    ...objects,
    '%%EOF',
  ].join('\n');
}

function textBlock(x: number, y: number, text: string, font = 'F1'): string {
  return ['BT', `/${font} 12 Tf`, `1 0 0 1 ${x} ${y} Tm`, `(${text}) Tj`, 'ET'].join('\n');
}

describe('PDF content stream scanning', () => {
  it('keeps a run whose shown text contains the letters ET', async () => {
    // "GALLETAS", "DONETTES" and "COCA COLA PET" all embed the ET operator.
    // Splitting the stream on the bare letters drops the whole row.
    const content = [
      textBlock(50, 700, 'AGUA BEZOYA 1,5 L                     0,69'),
      textBlock(50, 686, 'GALLETAS RELIEVE 735                  1,68'),
      textBlock(50, 672, 'DONETTES 8                            2,79'),
      textBlock(50, 658, 'COCA COLA PET 50CL                    1,39'),
    ].join('\n');

    const result = await extractTextFromPdf(buildPdf(content));

    expect(result.lines).toEqual([
      'AGUA BEZOYA 1,5 L 0,69',
      'GALLETAS RELIEVE 735 1,68',
      'DONETTES 8 2,79',
      'COCA COLA PET 50CL 1,39',
    ]);
  });

  it('keeps a run whose shown text contains BT, Tj and other operator names', async () => {
    const content = [textBlock(50, 700, 'DEBIT MASTERCARD'), textBlock(50, 686, 'BTS PACK 3')].join(
      '\n'
    );

    const result = await extractTextFromPdf(buildPdf(content));

    expect(result.lines).toEqual(['DEBIT MASTERCARD', 'BTS PACK 3']);
  });

  it('orders rows top to bottom when the CTM flips the y axis', async () => {
    // Carrefour wraps every block in "1 0 0 -1 20 906 cm", so the Tm y grows
    // downward and a naive descending sort prints the receipt upside down.
    // Carrefour selects the font at size 1 and carries the real 12pt in the
    // text matrix, so the effective size is the product of the two.
    const flipped = (y: number, text: string) =>
      [
        'q',
        '1 0 0 -1 20 906 cm',
        'BT',
        '/F1 1 Tf',
        `12 0 0 -12 18 ${y} Tm`,
        `(${text}) Tj`,
        'ET',
        'Q',
      ].join('\n');

    const content = [
      flipped(11, '*** CARREFOUR MARKET ***'),
      flipped(25, 'AGUA BEZOYA 1,5 L 0,69'),
      flipped(39, 'TOTAL A PAGAR : 10,59'),
    ].join('\n');

    const result = await extractTextFromPdf(buildPdf(content));

    expect(result.lines).toEqual([
      '*** CARREFOUR MARKET ***',
      'AGUA BEZOYA 1,5 L 0,69',
      'TOTAL A PAGAR : 10,59',
    ]);
  });

  it('decodes each font with its own ToUnicode map', async () => {
    // The box-drawing font maps the six codes it defines. Applying that map to
    // the text font turned "21,00%" into "21,00╝".
    const content = [
      textBlock(50, 700, '21,00%   1,42   0,30', 'F1'),
      textBlock(50, 686, '!"#', 'F2'),
    ].join('\n');

    const result = await extractTextFromPdf(
      buildPdf(content, [
        { name: 'F1' },
        {
          name: 'F2',
          toUnicode: [
            [0x21, '╔'],
            [0x22, '═'],
            [0x23, '╗'],
            [0x25, '╝'],
          ],
        },
      ])
    );

    expect(result.lines).toEqual(['21,00% 1,42 0,30', '╔═╗']);
  });

  it('decodes a MacRomanEncoding font without a ToUnicode map', async () => {
    // Carrefour's text font is MacRoman with no ToUnicode: 0x84 is N-tilde,
    // 0x8E e-acute, 0x97 o-acute, 0xBB the feminine ordinal.
    const content = textBlock(50, 700, 'PA\x84UELOS  Tel\x8Efono  Atenci\x97n  2\xBB');

    const result = await extractTextFromPdf(
      buildPdf(content, [{ name: 'F1', encoding: 'MacRomanEncoding' }])
    );

    expect(result.lines).toEqual(['PAÑUELOS Teléfono Atención 2ª']);
  });

  it('decodes a WinAnsiEncoding font without a ToUnicode map', async () => {
    const content = textBlock(50, 700, 'PA\xD1UELOS  Tel\xE9fono  2\xAA  \x80');

    const result = await extractTextFromPdf(
      buildPdf(content, [{ name: 'F1', encoding: 'WinAnsiEncoding' }])
    );

    expect(result.lines).toEqual(['PAÑUELOS Teléfono 2ª €']);
  });

  it('restores the text matrix at each BT and honours the q/Q stack', async () => {
    const content = [
      'q',
      '1 0 0 1 0 100 cm',
      'BT',
      '/F1 12 Tf',
      '1 0 0 1 50 600 Tm',
      '(INSIDE) Tj',
      'ET',
      'Q',
      'BT',
      '/F1 12 Tf',
      '1 0 0 1 50 600 Tm',
      '(OUTSIDE) Tj',
      'ET',
    ].join('\n');

    const result = await extractTextFromPdf(buildPdf(content));

    // The q/Q block sits 100 units higher, so it prints first.
    expect(result.lines).toEqual(['INSIDE', 'OUTSIDE']);
  });
});

describe('PDF page geometry', () => {
  function pageOf(content: string, height = 900): string {
    return buildPdf(content).replace(
      '<< /Type /Pages /Kids [ 1 0 R ] /Count 1 >>',
      `<< /Type /Pages /Kids [ 1 0 R ] /Count 1 /MediaBox [0 0 380 ${height}] >>`
    );
  }

  it('reports the page size and one block per printed row', async () => {
    const content = [
      textBlock(50, 800, 'MERCADONA, S.A.'),
      textBlock(50, 700, '1 BEBIDA AVENA'),
      textBlock(300, 700, '1,00'),
    ].join('\n');

    const result = await extractTextFromPdf(pageOf(content));

    expect(result.dimensions).toEqual({ width: 380, height: 900 });
    expect(result.blocks.map((block) => block.text)).toEqual([
      'MERCADONA, S.A.',
      '1 BEBIDA AVENA 1,00',
    ]);
    // The row's two columns stay separate lines, which is what zone detection
    // reads to tell a product column from a price column.
    expect(result.blocks[1].lines.map((line) => line.text)).toEqual(['1 BEBIDA AVENA', '1,00']);
    expect(result.blocks[1].lines[0].boundingBox.left).toBeLessThan(
      result.blocks[1].lines[1].boundingBox.left
    );
  });

  it('measures top downwards, so the first row is the topmost', async () => {
    const content = [textBlock(50, 800, 'HEADER'), textBlock(50, 100, 'FOOTER')].join('\n');

    const result = await extractTextFromPdf(pageOf(content));

    const [header, footer] = result.blocks;
    expect(header.text).toBe('HEADER');
    expect(header.boundingBox.top).toBeLessThan(footer.boundingBox.top);
    // 900pt page, baseline at 800 -> ~90pt from the top.
    expect(header.boundingBox.top).toBeCloseTo(90.4, 0);
  });

  it('places a y-flipped page the same way up as any other', async () => {
    // Carrefour paints through "1 0 0 -1 20 906 cm", so its Tm y grows downward.
    const flipped = (y: number, text: string) =>
      [
        'q',
        '1 0 0 -1 20 906 cm',
        'BT',
        '/F1 1 Tf',
        `12 0 0 -12 18 ${y} Tm`,
        `(${text}) Tj`,
        'ET',
        'Q',
      ].join('\n');

    const result = await extractTextFromPdf(
      pageOf([flipped(11, 'HEADER'), flipped(800, 'FOOTER')].join('\n'), 956)
    );

    const [header, footer] = result.blocks;
    expect(header.text).toBe('HEADER');
    expect(header.boundingBox.top).toBeLessThan(footer.boundingBox.top);
    expect(header.boundingBox.top).toBeGreaterThan(0);
    expect(footer.boundingBox.top).toBeLessThan(956);
  });
});

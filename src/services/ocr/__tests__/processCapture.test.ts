import { processCapture } from '../processCapture';
import { recognizeText } from '../index';
import { extractTextFromPdf } from '../../pdf';
import { MERCADONA_PHOTO_BLOCKS } from './fixtures.mercadonaPhoto';

jest.mock('../index', () => ({ recognizeText: jest.fn() }));
jest.mock('../../pdf', () => ({ extractTextFromPdf: jest.fn() }));

const recognizeTextMock = recognizeText as jest.MockedFunction<typeof recognizeText>;
const extractTextFromPdfMock = extractTextFromPdf as jest.MockedFunction<typeof extractTextFromPdf>;

const PHOTO_DIMS = { width: 612, height: 1122 };
const PHOTO_LINES = MERCADONA_PHOTO_BLOCKS.map((block) => block.text);
const PHOTO_TEXT = PHOTO_LINES.join('\n');

function ocrSuccess(overrides = {}) {
  return {
    success: true,
    text: PHOTO_TEXT,
    lines: PHOTO_LINES,
    blocks: MERCADONA_PHOTO_BLOCKS,
    ...overrides,
  };
}

describe('processCapture on a photograph', () => {
  it('hands back the recognized text with the zones found in it', async () => {
    recognizeTextMock.mockResolvedValue(ocrSuccess());

    const result = await processCapture({
      uri: 'file:///receipt.jpg',
      isPdf: false,
      knownDimensions: PHOTO_DIMS,
    });

    expect(result.success).toBe(true);
    expect(result.lines).toEqual(PHOTO_LINES);
    expect(result.blocks).toHaveLength(MERCADONA_PHOTO_BLOCKS.length);
    expect(result.zones.length).toBeGreaterThan(0);
    expect(result.dimensions).toEqual(PHOTO_DIMS);
  });

  it('reads the printed total off the receipt while detecting zones', async () => {
    recognizeTextMock.mockResolvedValue(ocrSuccess());

    const result = await processCapture({
      uri: 'file:///receipt.jpg',
      isPdf: false,
      knownDimensions: PHOTO_DIMS,
    });

    expect(result.detectedTotal).toBeCloseTo(28.58, 2);
  });

  it('places the zones in the geometry the recognizer reported', async () => {
    recognizeTextMock.mockResolvedValue(
      ocrSuccess({ inferredDimensions: { width: 1224, height: 2244 } })
    );

    const result = await processCapture({
      uri: 'file:///receipt.jpg',
      isPdf: false,
      knownDimensions: PHOTO_DIMS,
    });

    expect(result.dimensions).toEqual({ width: 1224, height: 2244 });
  });

  it('reports a failed recognition rather than an empty receipt', async () => {
    recognizeTextMock.mockResolvedValue({
      success: false,
      text: '',
      lines: [],
      blocks: [],
      error: 'boom',
    });

    const result = await processCapture({
      uri: 'file:///receipt.jpg',
      isPdf: false,
      knownDimensions: PHOTO_DIMS,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('ocr_failed');
  });

  it('treats a recognition that found no text as a failure', async () => {
    recognizeTextMock.mockResolvedValue({ success: true, text: '', lines: [], blocks: [] });

    const result = await processCapture({
      uri: 'file:///receipt.jpg',
      isPdf: false,
      knownDimensions: PHOTO_DIMS,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('ocr_failed');
  });
});

describe('processCapture on a PDF', () => {
  it('detects zones over the page rather than re-recognizing it', async () => {
    extractTextFromPdfMock.mockResolvedValue({
      success: true,
      text: PHOTO_TEXT,
      lines: PHOTO_LINES,
      pageCount: 1,
      blocks: MERCADONA_PHOTO_BLOCKS,
      dimensions: PHOTO_DIMS,
    });

    const result = await processCapture({ uri: 'file:///receipt.pdf', isPdf: true });

    expect(recognizeTextMock).not.toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(result.isPdf).toBe(true);
    expect(result.zones.length).toBeGreaterThan(0);
    expect(result.dimensions).toEqual(PHOTO_DIMS);
  });

  it('reports a PDF that carries no text of its own', async () => {
    extractTextFromPdfMock.mockResolvedValue({
      success: false,
      text: '',
      lines: [],
      pageCount: 1,
      blocks: [],
      dimensions: null,
      error: 'no_text_content',
    });

    const result = await processCapture({ uri: 'file:///scanned.pdf', isPdf: true });

    expect(result.success).toBe(false);
    expect(result.error).toBe('no_text_content');
  });
});

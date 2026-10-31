import { processCapture } from '../processCapture';
import { recognizeText } from '../index';
import { extractTextFromPdf } from '../../pdf';
import { MERCADONA_PHOTO_BLOCKS } from './fixtures.mercadonaPhoto';
import { recordCapture } from '../../bench/recordCapture';
import { decodeQrCodes } from '../../fiscal/decodeQr';

jest.mock('../index', () => ({ recognizeText: jest.fn() }));
jest.mock('../../pdf', () => ({ extractTextFromPdf: jest.fn() }));
jest.mock('../../bench/recordCapture', () => ({ recordCapture: jest.fn() }));
jest.mock('../../fiscal/decodeQr', () => ({ decodeQrCodes: jest.fn().mockResolvedValue([]) }));

const recordCaptureMock = recordCapture as jest.MockedFunction<typeof recordCapture>;

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

describe('processCapture recording for the benchmark', () => {
  const RAW = { text: PHOTO_TEXT, blocks: [] };

  it('records the raw reading with the size it was read at and where it came from', async () => {
    recognizeTextMock.mockResolvedValue(ocrSuccess({ raw: RAW }));

    await processCapture({
      uri: 'file:///receipt.jpg',
      isPdf: false,
      knownDimensions: PHOTO_DIMS,
      source: 'scanner',
    });

    expect(recordCaptureMock).toHaveBeenCalledWith({
      uri: 'file:///receipt.jpg',
      raw: RAW,
      knownDimensions: PHOTO_DIMS,
      source: 'scanner',
    });
  });

  it('records a reading that found no text, since a blank read is a result too', async () => {
    const blank = { text: '', blocks: [] };
    recognizeTextMock.mockResolvedValue({
      success: true,
      text: '',
      lines: [],
      blocks: [],
      raw: blank,
    });

    const result = await processCapture({
      uri: 'file:///receipt.jpg',
      isPdf: false,
      knownDimensions: PHOTO_DIMS,
      source: 'scanner',
    });

    expect(result.success).toBe(false);
    expect(recordCaptureMock).toHaveBeenCalledTimes(1);
  });

  it('finishes recording before handing the capture back, so the image is still there', async () => {
    let recorded = false;
    recordCaptureMock.mockImplementationOnce(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
      recorded = true;
    });
    recognizeTextMock.mockResolvedValue(ocrSuccess({ raw: RAW }));

    await processCapture({
      uri: 'file:///receipt.jpg',
      isPdf: false,
      knownDimensions: PHOTO_DIMS,
      source: 'scanner',
    });

    expect(recorded).toBe(true);
  });

  it('records nothing for a capture that names no source, such as a crop re-reading its image', async () => {
    recognizeTextMock.mockResolvedValue(ocrSuccess({ raw: RAW }));

    await processCapture({ uri: 'file:///receipt.jpg', isPdf: false, knownDimensions: PHOTO_DIMS });

    expect(recordCaptureMock).not.toHaveBeenCalled();
  });

  it('records nothing when the recognizer itself failed', async () => {
    recognizeTextMock.mockResolvedValue({
      success: false,
      text: '',
      lines: [],
      blocks: [],
      error: 'boom',
    });

    await processCapture({ uri: 'file:///receipt.jpg', isPdf: false, knownDimensions: PHOTO_DIMS });

    expect(recordCaptureMock).not.toHaveBeenCalled();
  });

  it('records nothing for a PDF', async () => {
    extractTextFromPdfMock.mockResolvedValue({
      success: true,
      text: PHOTO_TEXT,
      lines: PHOTO_LINES,
      pageCount: 1,
      blocks: MERCADONA_PHOTO_BLOCKS,
      dimensions: PHOTO_DIMS,
    });

    await processCapture({ uri: 'file:///receipt.pdf', isPdf: true });

    expect(recordCaptureMock).not.toHaveBeenCalled();
  });
});

const decodeQrCodesMock = decodeQrCodes as jest.MockedFunction<typeof decodeQrCodes>;
const PT_PAYLOAD =
  'A:502011475*B:999999990*C:PT*D:FS*E:N*F:20261015*G:FS 1/123*H:JJ3ZKXYZ-123*I1:PT*I7:10.00*I8:2.30*N:2.30*O:12.30*Q:AbCd*R:1234';

describe('processCapture and fiscal QR codes', () => {
  const photo = { uri: 'file:///receipt.jpg', isPdf: false, knownDimensions: PHOTO_DIMS };

  it('carries a decoded fiscal QR on the capture', async () => {
    recognizeTextMock.mockResolvedValue(ocrSuccess());
    decodeQrCodesMock.mockResolvedValue([PT_PAYLOAD]);

    expect((await processCapture(photo)).fiscal).toMatchObject({ countryCode: 'PT', total: 12.3 });
  });

  it('keeps the OCR reading when the QR is not fiscal', async () => {
    recognizeTextMock.mockResolvedValue(ocrSuccess());
    decodeQrCodesMock.mockResolvedValue(['https://club.example.com/u/1']);

    const result = await processCapture(photo);
    expect(result.fiscal).toBeNull();
    expect(result.lines).toEqual(PHOTO_LINES);
  });

  it('a PDF never decodes QR codes', async () => {
    extractTextFromPdfMock.mockResolvedValue({
      success: false,
      text: '',
      lines: [],
      blocks: [],
      error: 'no_text_content',
    } as never);
    decodeQrCodesMock.mockClear();

    await processCapture({ uri: 'file:///receipt.pdf', isPdf: true });
    expect(decodeQrCodesMock).not.toHaveBeenCalled();
  });
});

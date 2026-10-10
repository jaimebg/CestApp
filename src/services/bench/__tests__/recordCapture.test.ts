import {
  copyAsync,
  getInfoAsync,
  makeDirectoryAsync,
  writeAsStringAsync,
} from 'expo-file-system/legacy';
import { benchRecordId, recordCapture } from '../recordCapture';

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///docs/',
  getInfoAsync: jest.fn(),
  makeDirectoryAsync: jest.fn(),
  copyAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
}));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { version: '1.0.0' } },
}));

const getInfo = getInfoAsync as jest.Mock;
const makeDirectory = makeDirectoryAsync as jest.Mock;
const copy = copyAsync as jest.Mock;
const write = writeAsStringAsync as jest.Mock;

const RAW = { text: 'TOTAL 1,00', blocks: [] };
const DIMS = { width: 612, height: 1122 };
const NOW = new Date('2026-10-11T10:22:03.120Z');
const ID = '2026-10-11T10-22-03-120Z';

beforeEach(() => {
  getInfo.mockResolvedValue({ exists: true });
  makeDirectory.mockResolvedValue(undefined);
  copy.mockResolvedValue(undefined);
  write.mockResolvedValue(undefined);
});

describe('recordCapture', () => {
  it('names a record after its timestamp, safe for a file name', () => {
    expect(benchRecordId(NOW)).toBe(ID);
  });

  it('copies the image it read, keeping its extension in lower case', async () => {
    await recordCapture({ uri: 'file:///receipts/abc.PNG', raw: RAW, knownDimensions: DIMS }, NOW);

    expect(copy).toHaveBeenCalledWith({
      from: 'file:///receipts/abc.PNG',
      to: `file:///docs/bench/${ID}.png`,
    });
  });

  it('falls back to jpg when the image has no extension', async () => {
    await recordCapture({ uri: 'file:///receipts/abc', raw: RAW, knownDimensions: DIMS }, NOW);

    expect(copy).toHaveBeenCalledWith({
      from: 'file:///receipts/abc',
      to: `file:///docs/bench/${ID}.jpg`,
    });
  });

  it('writes the untouched recognizer output with what it was read from', async () => {
    await recordCapture(
      { uri: 'file:///receipts/abc.heic', raw: RAW, knownDimensions: DIMS, source: 'scanner' },
      NOW
    );

    const [path, json] = write.mock.calls[0];
    expect(path).toBe(`file:///docs/bench/${ID}.json`);
    expect(JSON.parse(json)).toEqual({
      schemaVersion: 1,
      id: ID,
      capturedAt: '2026-10-11T10:22:03.120Z',
      platform: expect.any(String),
      osVersion: expect.any(String),
      appVersion: '1.0.0',
      source: 'scanner',
      image: `${ID}.heic`,
      knownDimensions: DIMS,
      raw: RAW,
    });
  });

  it('records a missing source as null', async () => {
    await recordCapture({ uri: 'file:///receipts/abc.jpg', raw: RAW, knownDimensions: DIMS }, NOW);

    expect(JSON.parse(write.mock.calls[0][1]).source).toBeNull();
  });

  it('creates the folder on first use', async () => {
    getInfo.mockResolvedValue({ exists: false });

    await recordCapture({ uri: 'file:///receipts/abc.jpg', raw: RAW, knownDimensions: DIMS }, NOW);

    expect(makeDirectory).toHaveBeenCalledWith('file:///docs/bench/', { intermediates: true });
  });

  it('swallows a failure instead of breaking the scan', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    copy.mockRejectedValue(new Error('disk full'));

    await expect(
      recordCapture({ uri: 'file:///receipts/abc.jpg', raw: RAW, knownDimensions: DIMS }, NOW)
    ).resolves.toBeUndefined();
    expect(write).not.toHaveBeenCalled();
  });
});

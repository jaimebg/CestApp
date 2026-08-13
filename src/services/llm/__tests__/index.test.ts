import { structureReceipt, isLlmAvailable } from '../index';
import * as backend from '../appleBackend';

jest.mock('../appleBackend');

const mockBackend = backend as jest.Mocked<typeof backend>;
const LINES = ['1 LECHE 0,98', 'TOTAL 0,98'];

describe('isLlmAvailable', () => {
  it('delegates to the backend', () => {
    mockBackend.isBackendAvailable.mockReturnValue(true);
    expect(isLlmAvailable()).toBe(true);
  });
});

describe('structureReceipt', () => {
  beforeEach(() => {
    mockBackend.isBackendAvailable.mockReturnValue(true);
  });

  it('returns null without calling the backend when unavailable', async () => {
    mockBackend.isBackendAvailable.mockReturnValue(false);
    const result = await structureReceipt(LINES);
    expect(result).toBeNull();
    expect(mockBackend.generateStructured).not.toHaveBeenCalled();
  });

  it('returns a sanitized receipt on a well-formed response', async () => {
    mockBackend.generateStructured.mockResolvedValue({
      total: 0.98,
      items: [{ name: 'Leche', totalPrice: 0.98 }],
    });
    const result = await structureReceipt(LINES);
    expect(result?.items).toHaveLength(1);
    expect(result?.total).toBe(0.98);
  });

  it('returns null on a malformed response', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      mockBackend.generateStructured.mockResolvedValue({ nonsense: true });
      expect(await structureReceipt(LINES)).toBeNull();
      expect(warnSpy).toHaveBeenCalled();
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('returns null when the backend resolves null', async () => {
    mockBackend.generateStructured.mockResolvedValue(null);
    expect(await structureReceipt(LINES)).toBeNull();
  });

  it('returns null when the backend rejects', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      mockBackend.generateStructured.mockRejectedValue(new Error('boom'));
      expect(await structureReceipt(LINES)).toBeNull();
      expect(warnSpy).toHaveBeenCalled();
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('returns null when the backend never resolves', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.useFakeTimers();
    mockBackend.generateStructured.mockReturnValue(new Promise(() => {}));

    try {
      const pending = structureReceipt(LINES);
      jest.advanceTimersByTime(15000);

      expect(await pending).toBeNull();
      expect(warnSpy).toHaveBeenCalled();
    } finally {
      warnSpy.mockRestore();
      jest.useRealTimers();
    }
  });
});

import { AppleFoundationModels } from '@react-native-ai/apple';
import { isBackendAvailable, generateStructured } from '../appleBackend';

jest.mock('@react-native-ai/apple', () => ({
  AppleFoundationModels: {
    isAvailable: jest.fn(),
    generateText: jest.fn(),
  },
}));

const mockModule = AppleFoundationModels as jest.Mocked<typeof AppleFoundationModels>;

describe('isBackendAvailable', () => {
  it('returns true when the native module reports availability', () => {
    mockModule.isAvailable.mockReturnValue(true);
    expect(isBackendAvailable()).toBe(true);
  });

  it('returns false when the native module reports unavailability', () => {
    mockModule.isAvailable.mockReturnValue(false);
    expect(isBackendAvailable()).toBe(false);
  });

  it('returns false when the native module throws', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockModule.isAvailable.mockImplementation(() => {
      throw new Error('module missing');
    });
    expect(isBackendAvailable()).toBe(false);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

describe('generateStructured', () => {
  it('returns the parsed JSON from the first text part', async () => {
    mockModule.generateText.mockResolvedValue([{ type: 'text', text: '{"items":[]}' }]);
    const result = await generateStructured([{ role: 'user', content: 'hi' }], { type: 'object' });
    expect(result).toEqual({ items: [] });
  });

  it('returns null when there is no text part', async () => {
    mockModule.generateText.mockResolvedValue([]);
    const result = await generateStructured([{ role: 'user', content: 'hi' }], { type: 'object' });
    expect(result).toBeNull();
  });

  it('finds and parses text part even when it is not the first element', async () => {
    mockModule.generateText.mockResolvedValue([
      { type: 'tool-call', toolName: 'x', input: '{}' },
      { type: 'text', text: '{"items":[]}' },
    ]);
    const result = await generateStructured([{ role: 'user', content: 'hi' }], { type: 'object' });
    expect(result).toEqual({ items: [] });
  });

  it('returns null when the text is not valid JSON', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockModule.generateText.mockResolvedValue([{ type: 'text', text: 'lo siento, no puedo' }]);
    const result = await generateStructured([{ role: 'user', content: 'hi' }], { type: 'object' });
    expect(result).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('returns null when the native call rejects', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockModule.generateText.mockRejectedValue(new Error('modelUnavailable'));
    const result = await generateStructured([{ role: 'user', content: 'hi' }], { type: 'object' });
    expect(result).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

describe('on a non-iOS platform', () => {
  it('reports the backend unavailable without requiring the native library', () => {
    jest.resetModules();
    const appleFactory = jest.fn(() => ({
      AppleFoundationModels: { isAvailable: jest.fn(), generateText: jest.fn() },
    }));
    jest.doMock('react-native', () => ({ Platform: { OS: 'android' } }));
    jest.doMock('@react-native-ai/apple', appleFactory);

    // eslint-disable-next-line @typescript-eslint/no-require-imports -- fresh module instance needed after jest.resetModules().
    const backend = require('../appleBackend') as typeof import('../appleBackend');

    expect(backend.isBackendAvailable()).toBe(false);
    expect(appleFactory).not.toHaveBeenCalled();

    jest.resetModules();
  });

  it('resolves generateStructured to null without requiring the native library', async () => {
    jest.resetModules();
    const appleFactory = jest.fn(() => ({
      AppleFoundationModels: { isAvailable: jest.fn(), generateText: jest.fn() },
    }));
    jest.doMock('react-native', () => ({ Platform: { OS: 'android' } }));
    jest.doMock('@react-native-ai/apple', appleFactory);

    // eslint-disable-next-line @typescript-eslint/no-require-imports -- fresh module instance needed after jest.resetModules().
    const backend = require('../appleBackend') as typeof import('../appleBackend');

    await expect(
      backend.generateStructured([{ role: 'user', content: 'hi' }], { type: 'object' })
    ).resolves.toBeNull();
    expect(appleFactory).not.toHaveBeenCalled();

    jest.resetModules();
  });
});

describe('when requiring the native library throws', () => {
  it('returns false from isBackendAvailable instead of propagating', () => {
    jest.resetModules();
    jest.doMock('react-native', () => ({ Platform: { OS: 'ios' } }));
    jest.doMock('@react-native-ai/apple', () => {
      throw new Error('native module missing');
    });
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    // eslint-disable-next-line @typescript-eslint/no-require-imports -- fresh module instance needed after jest.resetModules().
    const backend = require('../appleBackend') as typeof import('../appleBackend');

    expect(backend.isBackendAvailable()).toBe(false);
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
    jest.resetModules();
  });
});

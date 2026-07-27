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
    mockModule.isAvailable.mockImplementation(() => {
      throw new Error('module missing');
    });
    expect(isBackendAvailable()).toBe(false);
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

  it('returns null when the text is not valid JSON', async () => {
    mockModule.generateText.mockResolvedValue([{ type: 'text', text: 'lo siento, no puedo' }]);
    const result = await generateStructured([{ role: 'user', content: 'hi' }], { type: 'object' });
    expect(result).toBeNull();
  });

  it('returns null when the native call rejects', async () => {
    mockModule.generateText.mockRejectedValue(new Error('modelUnavailable'));
    const result = await generateStructured([{ role: 'user', content: 'hi' }], { type: 'object' });
    expect(result).toBeNull();
  });
});

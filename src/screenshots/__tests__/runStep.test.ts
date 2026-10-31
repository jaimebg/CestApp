import { runScreenshotStep, type ScreenshotDeps } from '../runStep';

function deps(): ScreenshotDeps & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    clearAllData: jest.fn(async () => void calls.push('clear')),
    seedDemoData: jest.fn(async () => {
      calls.push('seed');
      return { receiptsCreated: 1, itemsCreated: 1 };
    }),
    setLanguage: jest.fn(() => void calls.push('language')),
    setColorScheme: jest.fn(() => void calls.push('scheme')),
    completeOnboarding: jest.fn(() => void calls.push('onboarding')),
    processCapture: jest.fn(async () => ({
      success: true,
      isPdf: false,
      ocrText: 'TOTAL 1,95',
      lines: ['TOTAL 1,95'],
      blocks: [],
      dimensions: { width: 100, height: 200 },
      zones: [],
      detectedTotal: 1.95,
      fiscal: null,
    })),
    setDraft: jest.fn(),
  };
}

test('setup clears, seeds and settles the preferences before the dashboard', async () => {
  const d = deps();
  expect(await runScreenshotStep('setup', {}, d)).toBe('/');
  expect(d.calls).toEqual(['clear', 'seed', 'language', 'scheme', 'onboarding']);
  expect(d.setLanguage).toHaveBeenCalledWith('es');
  expect(d.setColorScheme).toHaveBeenCalledWith('light');
});

test('review reads the photo and opens review with it as the draft', async () => {
  const d = deps();
  expect(await runScreenshotStep('review', { uri: 'file:///t.png' }, d)).toBe('/scan/review');
  expect(d.processCapture).toHaveBeenCalledWith({
    uri: 'file:///t.png',
    isPdf: false,
    source: 'gallery',
  });
  expect(d.setDraft).toHaveBeenCalledWith(
    expect.objectContaining({
      uri: 'file:///t.png',
      source: 'gallery',
      detectedTotal: 1.95,
      fiscal: null,
    })
  );
});

test('reading opens review with the reading view showing', async () => {
  expect(await runScreenshotStep('reading', { uri: 'file:///t.png' }, deps())).toBe(
    '/scan/review?reading=1'
  );
});

test('review without a photo is refused', async () => {
  await expect(runScreenshotStep('review', {}, deps())).rejects.toThrow('uri');
});

test('an unknown step is refused', async () => {
  await expect(runScreenshotStep('nope' as never, {}, deps())).rejects.toThrow('nope');
});

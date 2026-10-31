import type { CaptureProcessResult, CaptureProcessInput } from '../services/ocr/processCapture';
import type { ScanDraft } from '../store/scanDraft';

export type ScreenshotStep = 'setup' | 'review' | 'reading';

export interface ScreenshotDeps {
  clearAllData: () => Promise<void>;
  seedDemoData: () => Promise<unknown>;
  setLanguage: (language: 'es') => void;
  setColorScheme: (scheme: 'light') => void;
  completeOnboarding: () => void;
  processCapture: (input: CaptureProcessInput) => Promise<CaptureProcessResult>;
  setDraft: (draft: ScanDraft) => void;
}

async function openPhoto(uri: string | undefined, deps: ScreenshotDeps): Promise<void> {
  if (!uri) throw new Error('This step needs a photo uri');
  const processed = await deps.processCapture({ uri, isPdf: false, source: 'gallery' });
  deps.setDraft({
    uri,
    source: 'gallery',
    isPdf: processed.isPdf,
    ocrText: processed.ocrText,
    lines: processed.lines,
    blocks: processed.blocks,
    dimensions: processed.dimensions,
    zones: processed.zones,
    detectedTotal: processed.detectedTotal,
    fiscal: processed.fiscal,
  });
}

/**
 * Puts the app in the state one store screenshot needs and returns the route
 * to show: demo data in Spanish on a light theme, or the sample ticket read
 * into review (optionally with its reading view open).
 */
export async function runScreenshotStep(
  step: ScreenshotStep,
  params: { uri?: string },
  deps: ScreenshotDeps
): Promise<string> {
  switch (step) {
    case 'setup':
      await deps.clearAllData();
      await deps.seedDemoData();
      deps.setLanguage('es');
      deps.setColorScheme('light');
      deps.completeOnboarding();
      return '/';
    case 'review':
      await openPhoto(params.uri, deps);
      return '/scan/review';
    case 'reading':
      await openPhoto(params.uri, deps);
      return '/scan/review?reading=1';
    default:
      throw new Error(`Unknown screenshot step "${step as string}"`);
  }
}

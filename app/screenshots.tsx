/**
 * Store screenshot automation, reachable only in a build bundled with
 * EXPO_PUBLIC_SCREENSHOTS=1: cestapp:///screenshots?step=setup|review|reading&uri=…
 * In any other build it goes straight to the dashboard.
 */

import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect, router, useLocalSearchParams, type Href } from 'expo-router';
import { clearAllData, seedDemoData } from '@/src/db/demoData';
import { useAppColors } from '@/src/hooks/useAppColors';
import { getInfoAsync } from 'expo-file-system/legacy';
import { SCREENSHOT_MARKER, SCREENSHOT_MODE } from '@/src/screenshots/mode';
import { runScreenshotStep, type ScreenshotStep } from '@/src/screenshots/runStep';
import { processCapture } from '@/src/services/ocr/processCapture';
import { usePreferencesStore } from '@/src/store/preferences';
import { useScanDraftStore } from '@/src/store/scanDraft';
import { createScopedLogger } from '@/src/utils/debug';

const logger = createScopedLogger('Screenshots');

function ScreenshotStepRunner({ step, uri }: { step: ScreenshotStep; uri?: string }) {
  const colors = useAppColors();

  useEffect(() => {
    const preferences = usePreferencesStore.getState();
    runScreenshotStep(
      step,
      { uri },
      {
        clearAllData,
        seedDemoData,
        setLanguage: preferences.setLanguage,
        setColorScheme: preferences.setColorScheme,
        completeOnboarding: preferences.completeOnboarding,
        processCapture,
        setDraft: useScanDraftStore.getState().setDraft,
        markerPresent: async () => (await getInfoAsync(SCREENSHOT_MARKER)).exists,
      }
    )
      .then((route) => router.replace(route as Href))
      .catch((error) => {
        logger.error('Screenshot step failed:', error);
        router.replace('/');
      });
  }, [step, uri]);

  return (
    <View
      className="flex-1 items-center justify-center"
      style={{ backgroundColor: colors.background }}
    >
      <ActivityIndicator color={colors.action} />
    </View>
  );
}

export default function ScreenshotsRoute() {
  const { step, uri } = useLocalSearchParams<{ step: ScreenshotStep; uri?: string }>();
  if (!SCREENSHOT_MODE || !step) return <Redirect href="/" />;
  return <ScreenshotStepRunner step={step} uri={uri} />;
}

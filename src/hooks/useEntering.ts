/**
 * Entering animations that respect the OS "Reduce Motion" setting.
 *
 * Every screen animates content in. Spring overshoot and long staggers are
 * exactly the motion classes that provoke vestibular symptoms, so when the
 * user has asked for less motion the content still arrives — it just arrives
 * without travelling.
 */

import { useCallback } from 'react';
import { useReducedMotion, type BaseAnimationBuilder } from 'react-native-reanimated';

/**
 * Cap for index-based staggers. Without it a row at index 40 waits two
 * seconds before it is visible, and on a recycled list cell that delay
 * restarts every time the row scrolls back into view.
 */
export const MAX_STAGGER_STEPS = 8;

export function staggerDelay(index: number, step = 50): number {
  return Math.min(index, MAX_STAGGER_STEPS) * step;
}

export function useEntering() {
  const reduceMotion = useReducedMotion();

  return useCallback(
    <T extends typeof BaseAnimationBuilder>(preset: T, delay = 0, duration = 300) =>
      reduceMotion ? preset.duration(0) : preset.delay(delay).duration(duration),
    [reduceMotion]
  );
}

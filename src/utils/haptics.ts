import * as Haptics from 'expo-haptics';
import { createScopedLogger } from './debug';

const logger = createScopedLogger('Haptics');

export async function hapticSuccess() {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch (error) {
    logger.warn('Haptics unavailable:', error);
  }
}

export async function hapticDelete() {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch (error) {
    logger.warn('Haptics unavailable:', error);
  }
}

export async function hapticSelection() {
  try {
    await Haptics.selectionAsync();
  } catch (error) {
    logger.warn('Haptics unavailable:', error);
  }
}

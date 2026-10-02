import { useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import { usePreferences } from '@/lib/preferences';

const feelings = {
  pick: () => Haptics.selectionAsync(),
  undo: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  clear: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  failure: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
  delete: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
};

export type Haptic = keyof typeof feelings;

export function useHaptics(): (haptic: Haptic) => void {
  const { haptics } = usePreferences();

  return useCallback(
    (haptic: Haptic) => {
      if (haptics) {
        feelings[haptic]().catch(() => {});
      }
    },
    [haptics],
  );
}

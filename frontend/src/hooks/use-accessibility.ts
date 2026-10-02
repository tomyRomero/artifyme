import { useSyncExternalStore } from 'react';
import { AccessibilityInfo } from 'react-native';

type SettingEvent = 'reduceMotionChanged' | 'screenReaderChanged';

// One listener per setting, shared app-wide, so something mounted later knows it on its first frame
function followSetting(event: SettingEvent, read: () => Promise<boolean>): () => boolean {
  let enabled = false;
  const listeners = new Set<() => void>();
  let following: { remove: () => void } | null = null;

  function update(next: boolean) {
    if (next !== enabled) {
      enabled = next;
      listeners.forEach((listener) => listener());
    }
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    if (!following) {
      following = AccessibilityInfo.addEventListener(event, update);
      read().then(update);
    }
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) {
        following?.remove();
        following = null;
      }
    };
  }

  return () => useSyncExternalStore(subscribe, () => enabled);
}

export const useReduceMotion = followSetting('reduceMotionChanged', () => AccessibilityInfo.isReduceMotionEnabled());

export const useScreenReader = followSetting('screenReaderChanged', () => AccessibilityInfo.isScreenReaderEnabled());

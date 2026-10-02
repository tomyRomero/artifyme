import { jest } from '@jest/globals';
import type { ReactNode } from 'react';

// Mock with jest.mock('expo-router', () => require('@/test-utils/router').expoRouter)

export const goBack = jest.fn();
export const setOptions = jest.fn();

// The iOS context menu isn't rendered; its actions are tested through the accessibility actions
function Link({ children }: { children?: ReactNode }) {
  return children;
}
function Nothing() {
  return null;
}
Link.Trigger = Link;
Link.Menu = Nothing;
Link.MenuAction = Nothing;

export const expoRouter = {
  Link,
  router: {
    back: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
    dismissAll: jest.fn(),
    dismissTo: jest.fn(),
  },
  useNavigation: () => ({ getParent: () => ({ goBack }), setOptions }),
  useIsFocused: jest.fn(() => true),
  useRootNavigationState: () => ({ key: 'root' }),
  useLocalSearchParams: () => ({}),
  useGlobalSearchParams: () => ({}),
};

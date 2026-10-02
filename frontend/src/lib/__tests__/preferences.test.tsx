import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React, { type ReactNode } from 'react';
import { Appearance, useColorScheme } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';
import { PreferencesProvider, usePreferences } from '@/lib/preferences';
import { store, storedValue } from '@/test-utils';

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: jest.fn(() => 'light'),
}));

const wrapper = ({ children }: { children: ReactNode }) => <PreferencesProvider>{children}</PreferencesProvider>;

async function launch() {
  const rendered = await renderHook(() => usePreferences(), { wrapper });
  await act(async () => {});
  return rendered;
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.mocked(useColorScheme).mockReturnValue('light');
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('usePreferences', () => {
  it('follows the phone at first, with haptics on and the welcome and tips still to see', async () => {
    jest.mocked(useColorScheme).mockReturnValue('dark');

    const { result } = await launch();

    expect(result.current).toMatchObject({
      appearance: 'system',
      theme: 'dark',
      haptics: true,
      welcomed: false,
      undoTipSeen: false,
      loaded: true,
    });
  });

  it("uses the look chosen, and has the phone's own controls match it", async () => {
    const setColorScheme = jest.spyOn(Appearance, 'setColorScheme');
    const { result } = await launch();

    await act(async () => result.current.setAppearance('dark'));
    expect(result.current.theme).toBe('dark');
    expect(setColorScheme).toHaveBeenLastCalledWith('dark');

    await act(async () => result.current.setAppearance('system'));
    expect(setColorScheme).toHaveBeenLastCalledWith('unspecified');
  });

  it('keeps the choices for the next launch', async () => {
    const first = await launch();
    await act(async () => {
      first.result.current.setAppearance('light');
      first.result.current.setHaptics(false);
      first.result.current.finishWelcome();
      first.result.current.dismissUndoTip();
      first.result.current.setGrid(true);
      first.result.current.setAppLock(true);
      first.result.current.setBiometricSignIn(true);
      first.result.current.setArtworkNotifications(true);
    });
    await act(async () => jest.advanceTimersByTime(1000));
    expect(storedValue('preferences')).toEqual({
      appearance: 'light',
      haptics: false,
      welcomed: true,
      undoTipSeen: true,
      grid: true,
      appLock: true,
      biometricSignIn: true,
      biometricSignInOffered: true,
      artworkNotifications: true,
      artworkNotificationsOffered: true,
    });
    await first.unmount();

    const second = await launch();

    expect(second.result.current).toMatchObject({
      appearance: 'light',
      haptics: false,
      welcomed: true,
      undoTipSeen: true,
      grid: true,
      appLock: true,
      biometricSignIn: true,
      artworkNotifications: true,
    });
  });

  it('keeps what still makes sense from stored choices of another version', async () => {
    store('preferences', { appearance: 'sepia', haptics: false, welcomed: 'yes', fontSize: 'large' });

    const { result } = await launch();

    expect(result.current).toMatchObject({ appearance: 'system', haptics: false, welcomed: false });
  });
});

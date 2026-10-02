import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React, { type ReactNode } from 'react';
import * as Haptics from 'expo-haptics';
import { act, renderHook } from '@testing-library/react-native';
import { useHaptics } from '@/lib/haptics';
import { PreferencesProvider, usePreferences } from '@/lib/preferences';

const wrapper = ({ children }: { children: ReactNode }) => <PreferencesProvider>{children}</PreferencesProvider>;

async function renderHaptics() {
  const rendered = await renderHook(() => ({ haptic: useHaptics(), preferences: usePreferences() }), { wrapper });
  await act(async () => {});
  return rendered;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useHaptics', () => {
  it('plays nothing with haptics turned off', async () => {
    const { result } = await renderHaptics();

    await act(async () => result.current.preferences.setHaptics(false));
    result.current.haptic('pick');
    result.current.haptic('success');

    expect(Haptics.selectionAsync).not.toHaveBeenCalled();
    expect(Haptics.notificationAsync).not.toHaveBeenCalled();
  });

  it("ignores a phone that can't play it", async () => {
    jest.mocked(Haptics.selectionAsync).mockRejectedValueOnce(new Error('Haptics are unavailable'));
    const { result } = await renderHaptics();

    result.current.haptic('pick');
    // An unhandled rejection would fail the test here
    await act(async () => {});

    expect(Haptics.selectionAsync).toHaveBeenCalled();
  });
});

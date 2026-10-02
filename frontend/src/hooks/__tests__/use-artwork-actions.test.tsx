import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React, { type ReactNode } from 'react';
import { Alert, Linking } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react-native';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { useArtworkActions } from '@/hooks/use-artwork-actions';
import { PreferencesProvider } from '@/lib/preferences';
import { session } from '@/lib/session';
import { fakeResponse, fakeTokens, testQueryClient } from '@/test-utils';
import { couch } from '@/test-utils/studio';

jest.mock('expo-router', () => require('@/test-utils/router').expoRouter);
jest.mock('expo-sharing', () => ({ shareAsync: jest.fn(async () => {}) }));

const fetchMock = jest.fn<(url: string, init: RequestInit) => Promise<Response>>();
const alertMock = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

beforeAll(() => {
  process.env.EXPO_PUBLIC_DOTNET_API_URL = 'https://api.test';
  global.fetch = fetchMock as unknown as typeof fetch;
});

beforeEach(async () => {
  jest.clearAllMocks();
  await session.save(fakeTokens());
  fetchMock.mockImplementation(async (url, init) => {
    const { pathname } = new URL(url);
    if (pathname.startsWith('/api/v1/artworks/')) {
      return fakeResponse(200, couch);
    }
    throw new Error(`Unexpected ${init.method ?? 'GET'} ${pathname}`);
  });
});

function renderActions() {
  const queryClient = testQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <PreferencesProvider>{children}</PreferencesProvider>
    </QueryClientProvider>
  );
  return renderHook(() => useArtworkActions(), { wrapper });
}

function alertButtons() {
  return alertMock.mock.calls.at(-1)![2]!;
}

describe('useArtworkActions', () => {
  it('shares the full image as a file, not the thumbnail', async () => {
    const { result } = await renderActions();

    await act(async () => result.current.share('a1'));

    expect(Sharing.shareAsync).toHaveBeenCalledWith('cache/image.webp');
  });

  it('adds the full image to Photos, asking only to add', async () => {
    const { result } = await renderActions();

    let saved = false;
    await act(async () => {
      saved = await result.current.saveToPhotos('a1');
    });

    expect(saved).toBe(true);
    expect(MediaLibrary.requestPermissionsAsync).toHaveBeenCalledWith(true);
    expect(MediaLibrary.Asset.create).toHaveBeenCalledWith('cache/image.webp');
  });

  it('offers the Settings when adding photos is refused', async () => {
    jest
      .mocked(MediaLibrary.requestPermissionsAsync)
      .mockResolvedValueOnce({ granted: false } as MediaLibrary.PermissionResponse);
    const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
    const { result } = await renderActions();

    await act(async () => {
      await result.current.saveToPhotos('a1');
    });

    expect(MediaLibrary.Asset.create).not.toHaveBeenCalled();
    alertButtons().find((button) => button.text === 'Open Settings')!.onPress!();
    expect(openSettings).toHaveBeenCalled();
  });
});

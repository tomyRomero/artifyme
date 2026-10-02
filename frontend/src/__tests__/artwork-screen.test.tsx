import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { Alert } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import * as MediaLibrary from 'expo-media-library';
import ArtworkScreen from '@/app/artwork/[id]';
import type { ArtworkDetails } from '@/api/types';
import { PreferencesProvider } from '@/lib/preferences';
import { session } from '@/lib/session';
import { fakeResponse, fakeTokens, testQueryClient } from '@/test-utils';
import { setOptions } from '@/test-utils/router';
import { couch, styles } from '@/test-utils/studio';

jest.mock('expo-router', () => ({
  ...require('@/test-utils/router').expoRouter,
  useLocalSearchParams: () => ({ id: 'a1' }),
}));

const fetchMock = jest.fn<(url: string, init: RequestInit) => Promise<Response>>();
const alertMock = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

let stored: ArtworkDetails | null = null;
let offline = false;
const deleted: string[] = [];

beforeAll(() => {
  process.env.EXPO_PUBLIC_DOTNET_API_URL = 'https://api.test';
  global.fetch = fetchMock as unknown as typeof fetch;
});

beforeEach(async () => {
  jest.clearAllMocks();
  stored = { ...couch, creationDateTime: '2026-03-12T12:00:00Z' };
  offline = false;
  deleted.length = 0;
  await session.save(fakeTokens());
  fetchMock.mockImplementation(async (url, init) => {
    if (offline) {
      throw new TypeError('Network request failed');
    }
    const { pathname } = new URL(url);
    if (pathname === '/api/v1/styles') {
      return fakeResponse(200, styles);
    }
    const id = pathname.match(/^\/api\/v1\/artworks\/(.+)$/)?.[1];
    if (id && init.method === 'DELETE') {
      deleted.push(id);
      return fakeResponse(204);
    }
    if (id) {
      return stored ? fakeResponse(200, stored) : fakeResponse(404);
    }
    throw new Error(`Unexpected ${pathname}`);
  });
});

async function renderArtwork() {
  await render(
    <QueryClientProvider client={testQueryClient()}>
      <PreferencesProvider>
        <ArtworkScreen />
      </PreferencesProvider>
    </QueryClientProvider>,
  );
}

describe('an artwork', () => {
  it('shows the artwork, its words and the day it was made', async () => {
    await renderArtwork();

    expect(await screen.findByRole('header', { name: 'Couch' })).toBeTruthy();
    expect(screen.getByRole('image', { name: 'Couch' })).toBeTruthy();
    expect(screen.getByText('a comfy couch')).toBeTruthy();
    expect(screen.getByText(/Made on .*12.*March.*2026|Made on March 12, 2026/)).toBeTruthy();
  });

  it('switches to the sketch, and to the two side by side', async () => {
    await renderArtwork();
    await screen.findByRole('header', { name: 'Couch' });

    await fireEvent.press(screen.getByRole('button', { name: 'Sketch' }));
    expect(screen.getByRole('image', { name: 'The sketch for Couch' })).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Compare' }));
    expect(screen.getByRole('adjustable', { name: 'Couch: sketch and artwork' })).toBeTruthy();
  });

  it("can't be swiped closed while comparing, so dragging the divide never pulls the sheet", async () => {
    await renderArtwork();
    await screen.findByRole('header', { name: 'Couch' });
    expect(setOptions).toHaveBeenLastCalledWith({ gestureEnabled: true });

    await fireEvent.press(screen.getByRole('button', { name: 'Compare' }));
    expect(setOptions).toHaveBeenLastCalledWith({ gestureEnabled: false });

    await fireEvent.press(screen.getByRole('button', { name: 'Artwork' }));
    expect(setOptions).toHaveBeenLastCalledWith({ gestureEnabled: true });
  });

  it('says once it has been saved to Photos', async () => {
    await renderArtwork();

    await fireEvent.press(await screen.findByRole('button', { name: 'Save to Photos' }));

    expect(await screen.findByText('Saved to Photos')).toBeTruthy();
    expect(MediaLibrary.Asset.create).toHaveBeenCalled();
  });

  it('opens the studio to edit it', async () => {
    await renderArtwork();

    await fireEvent.press(await screen.findByRole('button', { name: 'Edit' }));

    expect(router.push).toHaveBeenCalledWith({ pathname: '/studio', params: { artwork: 'a1' } });
  });

  it('closes once deleted, after asking', async () => {
    await renderArtwork();

    await fireEvent.press(await screen.findByRole('button', { name: 'Delete' }));
    expect(alertMock).toHaveBeenCalledWith('Delete "Couch"?', expect.any(String), expect.any(Array));
    expect(deleted).toEqual([]);
    const buttons = alertMock.mock.calls.at(-1)![2]!;
    await act(async () => buttons.find((button) => button.text === 'Delete')!.onPress!());

    await waitFor(() => expect(router.back).toHaveBeenCalled());
    expect(deleted).toEqual(['a1']);
  });
});

describe('how it was made', () => {
  const making = {
    outlineImageUrl: 'https://account.r2.cloudflarestorage.com/artifyme/users/1/outline.webp?X-Amz-Signature=o',
    prompt: 'a comfy couch, watercolor painting, soft washes',
    model: 'Stable Diffusion 1.5 with ControlNet Scribble',
    device: 'mps',
    seed: 1234,
    steps: 20,
    startedAt: '2026-03-12T12:00:00Z',
    finishedAt: '2026-03-12T12:06:51Z',
  };

  it('stays folded away until opened, then shows each stage and the details', async () => {
    stored = { ...couch, style: 'watercolor', howItWasMade: making };
    await renderArtwork();

    const toggle = await screen.findByRole('button', { name: 'How it was made' });
    expect(toggle).not.toBeExpanded();
    expect(screen.queryByText('2 · The outline it followed')).toBeNull();

    await fireEvent.press(toggle);

    expect(toggle).toBeExpanded();
    expect(screen.getByText('2 · The outline it followed')).toBeTruthy();
    expect(screen.getByLabelText('Style: Watercolor')).toBeTruthy();
    expect(screen.getByLabelText('Prompt: a comfy couch, watercolor painting, soft washes')).toBeTruthy();
    expect(screen.getByLabelText('Painted in: 6 min 51 s')).toBeTruthy();
    expect(screen.getByLabelText('Ran on: Apple GPU')).toBeTruthy();
  });

  it("isn't there for an artwork made before it was recorded", async () => {
    await renderArtwork();
    await screen.findByRole('header', { name: 'Couch' });

    expect(screen.queryByRole('button', { name: 'How it was made' })).toBeNull();
  });
});

describe('an artwork that is not there', () => {
  it('says it was deleted or never existed', async () => {
    stored = null;

    await renderArtwork();

    expect(await screen.findByText("This artwork isn't here")).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Back to the gallery' }));
    expect(router.back).toHaveBeenCalled();
  });

  it("says when it can't be reached, and tries again", async () => {
    offline = true;
    await renderArtwork();
    expect(await screen.findByText("Can't load this artwork")).toBeTruthy();

    offline = false;
    await fireEvent.press(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByRole('header', { name: 'Couch' })).toBeTruthy();
  });
});

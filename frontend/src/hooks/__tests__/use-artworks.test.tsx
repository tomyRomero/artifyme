import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React, { type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ArtworkSummary } from '@/api/types';
import { GALLERY_PAGE_SIZE, useDeleteArtwork, useGallery } from '@/hooks/use-artworks';
import { session } from '@/lib/session';
import { fakeResponse, fakeTokens, testQueryClient } from '@/test-utils';

const fetchMock = jest.fn<(url: string, init: RequestInit) => Promise<Response>>();

function summary(id: string): ArtworkSummary {
  return { id, title: id, description: null, creationDateTime: '2026-09-30T12:00:00Z', imageUrl: null };
}

let artworks: ArtworkSummary[] = [];
const requestedPages: number[] = [];

beforeAll(() => {
  process.env.EXPO_PUBLIC_DOTNET_API_URL = 'https://api.test';
  global.fetch = fetchMock as unknown as typeof fetch;
});

beforeEach(async () => {
  requestedPages.length = 0;
  await session.save(fakeTokens());
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (url, init) => {
    const { pathname, searchParams } = new URL(url);
    if (pathname === '/api/v1/artworks') {
      const page = Number(searchParams.get('page'));
      const size = Number(searchParams.get('pageSize'));
      requestedPages.push(page);
      return fakeResponse(200, {
        items: artworks.slice((page - 1) * size, page * size),
        hasMore: page * size < artworks.length,
      });
    }
    if (pathname.startsWith('/api/v1/artworks/') && init.method === 'DELETE') {
      artworks = artworks.filter((artwork) => `/api/v1/artworks/${artwork.id}` !== pathname);
      return fakeResponse(204);
    }
    throw new Error(`Unexpected ${init.method ?? 'GET'} ${pathname}`);
  });
});

function renderGallery() {
  const queryClient = testQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(() => ({ gallery: useGallery(), remove: useDeleteArtwork() }), { wrapper });
}

const ids = (list: ArtworkSummary[]) => list.map((artwork) => artwork.id);

describe('useGallery', () => {
  it('loads a page at a time, and stops after the last', async () => {
    artworks = Array.from({ length: GALLERY_PAGE_SIZE + 2 }, (_, index) => summary(`a${index}`));
    const { result } = await renderGallery();
    await waitFor(() => expect(result.current.gallery.artworks).toHaveLength(GALLERY_PAGE_SIZE));
    expect(result.current.gallery.hasNextPage).toBe(true);

    await act(async () => {
      await result.current.gallery.fetchNextPage();
    });

    await waitFor(() => expect(ids(result.current.gallery.artworks)).toEqual(ids(artworks)));
    expect(result.current.gallery.hasNextPage).toBe(false);
    expect(requestedPages).toEqual([1, 2]);
  });

  it('shows an artwork once when a new one pushes it onto the next page', async () => {
    artworks = Array.from({ length: GALLERY_PAGE_SIZE + 1 }, (_, index) => summary(`a${index}`));
    const { result } = await renderGallery();
    await waitFor(() => expect(result.current.gallery.artworks).toHaveLength(GALLERY_PAGE_SIZE));

    artworks = [summary('new'), ...artworks];
    await act(async () => {
      await result.current.gallery.fetchNextPage();
    });

    await waitFor(() => expect(ids(result.current.gallery.artworks)).toContain(`a${GALLERY_PAGE_SIZE}`));
    const shown = ids(result.current.gallery.artworks);
    expect(new Set(shown).size).toBe(shown.length);
  });

  it('removes a deleted artwork from the gallery', async () => {
    artworks = [summary('a1'), summary('a2')];
    const { result } = await renderGallery();
    await waitFor(() => expect(result.current.gallery.artworks).toHaveLength(2));

    await act(async () => {
      await result.current.remove.mutateAsync('a1');
    });

    await waitFor(() => expect(ids(result.current.gallery.artworks)).toEqual(['a2']));
  });

  it('loads nothing for a guest', async () => {
    await session.signOut();
    const { result } = await renderGallery();

    expect(result.current.gallery.artworks).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

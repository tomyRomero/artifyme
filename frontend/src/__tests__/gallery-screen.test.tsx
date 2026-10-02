import { afterEach, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { Alert } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { router, useIsFocused } from 'expo-router';
import GalleryScreen from '@/app/(tabs)/index';
import type { ArtworkSummary, Generation } from '@/api/types';
import { GALLERY_PAGE_SIZE } from '@/hooks/use-artworks';
import { PreferencesProvider } from '@/lib/preferences';
import { session } from '@/lib/session';
import { fakeResponse, fakeTokens, testQueryClient } from '@/test-utils';
import { generation, styles } from '@/test-utils/studio';

jest.mock('expo-router', () => require('@/test-utils/router').expoRouter);

const fetchMock = jest.fn<(url: string, init: RequestInit) => Promise<Response>>();

let artworks: ArtworkSummary[] = [];
// The style each artwork was painted in, by id
let styleOf: Record<string, string> = {};
let active: Generation | null = null;
let offline = false;
// Holds the API's answers until released
let held: Promise<void> | null = null;
const requestedPages: number[] = [];
let lastQuery = new URLSearchParams();
let queryClient: QueryClient;

function summary(id: string, changes: Partial<ArtworkSummary> = {}): ArtworkSummary {
  return {
    id,
    title: `Artwork ${id}`,
    description: null,
    creationDateTime: new Date().toISOString(),
    imageUrl: null,
    ...changes,
  };
}

beforeAll(() => {
  process.env.EXPO_PUBLIC_DOTNET_API_URL = 'https://api.test';
  global.fetch = fetchMock as unknown as typeof fetch;
});

beforeEach(async () => {
  // FlatList renders cells in timed batches; with fake timers they run inside waitFor
  jest.useFakeTimers();
  jest.clearAllMocks();
  jest.mocked(useIsFocused).mockReturnValue(true);
  artworks = [];
  styleOf = {};
  active = null;
  offline = false;
  held = null;
  requestedPages.length = 0;
  await session.save(fakeTokens());
  fetchMock.mockImplementation(async (url) => {
    await held;
    if (offline) {
      throw new TypeError('Network request failed');
    }
    const { pathname, searchParams } = new URL(url);
    if (pathname === '/api/v1/artworks') {
      const page = Number(searchParams.get('page'));
      const size = Number(searchParams.get('pageSize'));
      requestedPages.push(page);
      lastQuery = searchParams;
      const found = matching(searchParams);
      return fakeResponse(200, {
        items: found.slice((page - 1) * size, page * size),
        hasMore: page * size < found.length,
      });
    }
    if (pathname === '/api/v1/styles') {
      return fakeResponse(200, styles);
    }
    if (pathname === '/api/v1/generations/active') {
      return active ? fakeResponse(200, active) : fakeResponse(204);
    }
    throw new Error(`Unexpected ${pathname}`);
  });
});

afterEach(() => {
  jest.useRealTimers();
});

function matching(query: URLSearchParams): ArtworkSummary[] {
  const search = query.get('search')?.toLowerCase();
  const style = query.get('style');
  const found = artworks.filter(
    (artwork) =>
      (!search || `${artwork.title} ${artwork.description ?? ''}`.toLowerCase().includes(search)) &&
      (!style || styleOf[artwork.id] === style),
  );
  return query.get('sort') === 'oldest' ? found.reverse() : found;
}

const gallery = () => (
  <QueryClientProvider client={queryClient}>
    <PreferencesProvider>
      <GalleryScreen />
    </PreferencesProvider>
  </QueryClientProvider>
);

async function renderGallery() {
  queryClient = testQueryClient();
  await render(gallery());
}

describe('the gallery', () => {
  it('shows each artwork with its title and when it was made', async () => {
    artworks = [summary('a1', { title: 'Couch', description: 'a comfy couch' })];

    await renderGallery();

    expect(await screen.findByText('Couch')).toBeTruthy();
    expect(screen.getByText('Just now')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Couch. a comfy couch. Made just now.' })).toBeTruthy();
  });

  it('shows the grid taking shape while the first page loads', async () => {
    artworks = [summary('a1')];
    let release = () => {};
    held = new Promise((resolve) => (release = resolve));

    await renderGallery();
    expect(screen.getByLabelText('Loading your gallery')).toBeTruthy();

    release();
    expect(await screen.findByText('Artwork a1')).toBeTruthy();
  });

  it('slides in an artwork that arrives at the top, not those already there or loaded by scrolling', async () => {
    artworks = Array.from({ length: GALLERY_PAGE_SIZE + 1 }, (_, index) => summary(`a${index}`));
    await renderGallery();
    await screen.findByText('Artwork a0');
    await fireEvent(screen.getByTestId('gallery'), 'endReached');
    await waitFor(() => expect(requestedPages).toEqual([1, 2]));
    expect(screen.queryAllByTestId('arriving')).toHaveLength(0);

    artworks = [summary('new'), ...artworks];
    await act(async () => queryClient.invalidateQueries());

    const arriving = await screen.findByTestId('arriving');
    expect(within(arriving).getByText('Artwork new')).toBeTruthy();
    expect(screen.getAllByTestId('arriving')).toHaveLength(1);
  });

  it('slides in an artwork made behind the studio once the gallery is back in view', async () => {
    artworks = [summary('a1')];
    await renderGallery();
    await screen.findByText('Artwork a1');

    jest.mocked(useIsFocused).mockReturnValue(false);
    artworks = [summary('new'), ...artworks];
    await act(async () => queryClient.invalidateQueries());
    await screen.findByText('Artwork new');
    expect(screen.queryAllByTestId('arriving')).toHaveLength(0);

    jest.mocked(useIsFocused).mockReturnValue(true);
    await screen.rerender(gallery());

    expect(within(screen.getByTestId('arriving')).getByText('Artwork new')).toBeTruthy();
  });

  it('invites drawing when it is empty, with nothing to search yet', async () => {
    await renderGallery();

    await fireEvent.press(await screen.findByRole('button', { name: 'Start drawing' }));

    expect(router.push).toHaveBeenCalledWith('/studio');
    expect(screen.queryByLabelText('Search your gallery')).toBeNull();
  });

  it('keeps its title in place, with a line under it once the grid scrolls', async () => {
    artworks = [summary('a1')];
    await renderGallery();
    await screen.findByText('Artwork a1');
    const header = screen.getByTestId('screen-header');
    expect(header).toHaveStyle({ borderBottomColor: 'transparent' });

    await fireEvent.scroll(screen.getByTestId('gallery'), { nativeEvent: { contentOffset: { y: 120 } } });

    expect(within(header).getByRole('header', { name: 'Gallery' })).toBeTruthy();
    expect(header).not.toHaveStyle({ borderBottomColor: 'transparent' });
  });

  it('shows an artwork still being painted, which opens its progress', async () => {
    active = generation({ status: 'running', step: 5, position: null });

    await renderGallery();

    const card = await screen.findByRole('button', { name: 'Painting a new artwork. Painting… 5 of 25' });
    expect(screen.queryByText('Your gallery is empty')).toBeNull();
    await fireEvent.press(card);
    expect(router.push).toHaveBeenCalledWith('/studio');
  });

  it("says when it can't reach the API, and tries again", async () => {
    offline = true;
    await renderGallery();
    expect(await screen.findByText("Can't load your gallery")).toBeTruthy();
    expect(screen.getByText("ArtifyMe can't be reached. Check your connection, then try again.")).toBeTruthy();

    offline = false;
    artworks = [summary('a1')];
    await fireEvent.press(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByText('Artwork a1')).toBeTruthy();
  });

  it('offers what the long-press menu does to screen readers too', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    artworks = [summary('a1', { title: 'Couch' })];
    await renderGallery();

    await fireEvent(await screen.findByRole('button', { name: /^Couch\./ }), 'accessibilityAction', {
      nativeEvent: { actionName: 'delete' },
    });

    expect(Alert.alert).toHaveBeenCalledWith('Delete "Couch"?', expect.any(String), expect.any(Array));
  });
});

describe('finding an artwork', () => {
  beforeEach(() => {
    artworks = [
      summary('a1', { title: 'Comfy couch', description: 'a red velvet couch' }),
      summary('a2', { title: 'Harbour', description: 'boats at dusk' }),
      summary('a3', { title: 'Cat nap', description: 'a cat asleep on a couch' }),
    ];
    styleOf = { a2: 'watercolor', a3: 'pencil' };
  });

  it('searches titles and descriptions once typing pauses', async () => {
    await renderGallery();
    await screen.findByText('Harbour');

    let release = () => {};
    held = new Promise((resolve) => (release = resolve));
    await fireEvent.changeText(screen.getByLabelText('Search your gallery'), ' couch ');
    expect(lastQuery.get('search')).toBeNull();
    await act(async () => jest.advanceTimersByTime(300));

    expect(await screen.findByLabelText('Searching')).toBeTruthy();
    expect(screen.getByText('Harbour')).toBeTruthy();
    release();
    await waitFor(() => expect(screen.queryByText('Harbour')).toBeNull());
    expect(screen.queryByLabelText('Searching')).toBeNull();
    expect(lastQuery.get('search')).toBe('couch');
    expect(screen.getByText('Comfy couch')).toBeTruthy();
    expect(screen.getByText('Cat nap')).toBeTruthy();
  });

  it('shows one style at a time', async () => {
    await renderGallery();
    await screen.findByText('Harbour');

    await fireEvent.press(await screen.findByRole('button', { name: 'Watercolor' }));

    await waitFor(() => expect(screen.queryByText('Cat nap')).toBeNull());
    expect(screen.getByText('Harbour')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Watercolor' })).toBeSelected();

    await fireEvent.press(screen.getByRole('button', { name: 'All styles' }));

    expect(await screen.findByText('Cat nap')).toBeTruthy();
    expect(lastQuery.get('style')).toBeNull();
  });

  it('puts the oldest first, and back', async () => {
    await renderGallery();
    await screen.findByText('Harbour');

    await fireEvent.press(screen.getByRole('button', { name: 'Newest first' }));

    await waitFor(() => expect(lastQuery.get('sort')).toBe('oldest'));
    await waitFor(() => expect(screen.getAllByText(/^(Comfy couch|Harbour|Cat nap)$/)[0]).toHaveTextContent('Cat nap'));

    await fireEvent.press(screen.getByRole('button', { name: 'Oldest first' }));

    await waitFor(() => expect(lastQuery.get('sort')).toBeNull());
  });

  it('says when nothing matches, and clears the search and style', async () => {
    await renderGallery();
    await screen.findByText('Harbour');
    await fireEvent.press(await screen.findByRole('button', { name: 'Pencil' }));
    await fireEvent.changeText(screen.getByLabelText('Search your gallery'), 'boats');
    await act(async () => jest.advanceTimersByTime(300));

    expect(await screen.findByText('No matches')).toBeTruthy();
    expect(screen.getByText('None of your Pencil artworks match "boats".')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Clear filters' }));
    await act(async () => jest.advanceTimersByTime(300));

    expect(await screen.findByText('Harbour')).toBeTruthy();
    expect(screen.getByLabelText('Search your gallery')).toHaveProp('value', '');
  });

  it("doesn't slide in the results of a search", async () => {
    // Older than the whole first page, so the gallery hasn't shown it yet
    artworks = [
      ...Array.from({ length: GALLERY_PAGE_SIZE }, (_, index) => summary(`a${index}`)),
      summary('old', { title: 'Old sketch' }),
    ];
    styleOf = { old: 'pencil' };
    await renderGallery();
    await screen.findByText('Artwork a0');

    await fireEvent.press(await screen.findByRole('button', { name: 'Pencil' }));

    expect(await screen.findByText('Old sketch')).toBeTruthy();
    expect(screen.queryAllByTestId('arriving')).toHaveLength(0);
  });
});

describe('the gallery for a guest', () => {
  it('asks to sign in, or to try the app without an account', async () => {
    await session.signOut();
    await renderGallery();

    await fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
    expect(router.push).toHaveBeenCalledWith('/login');
    await fireEvent.press(screen.getByRole('button', { name: 'Try without an account' }));
    expect(router.push).toHaveBeenCalledWith('/studio');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

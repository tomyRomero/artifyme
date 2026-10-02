import { afterEach, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React, { type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { Generation, GenerationRequest } from '@/api/types';
import { session } from '@/lib/session';
import { fakeResponse, fakeTokens, testQueryClient } from '@/test-utils';
import { useGenerationFlow } from '@/hooks/use-generation-flow';

const fetchMock = jest.fn<(url: string, init: RequestInit) => Promise<Response>>();

const server = {
  generation: null as Generation | null,
  active: null as Generation | null,
  refuseStart: null as Response | null,
  polls: 0,
};

// Polls are a second apart, longer than waitFor's default timeout
const nextPoll = { timeout: 3000 };

function generation(changes: Partial<Generation> = {}): Generation {
  return {
    id: 'g1',
    status: 'queued',
    error: null,
    step: 0,
    totalSteps: 20,
    position: 0,
    seed: 42,
    artworkId: null,
    createdAt: '2026-09-30T12:00:00Z',
    startedAt: null,
    preview: null,
    ...changes,
  };
}

const request: GenerationRequest = {
  sketch: 'data:image/png;base64,AAAA',
  description: 'a cat on a boat',
  title: 'Cat',
  paths: [{ path: ['M1,1 ', '2,2 '], color: '#000000', size: 2 }],
};

beforeAll(() => {
  process.env.EXPO_PUBLIC_DOTNET_API_URL = 'https://api.test';
  global.fetch = fetchMock as unknown as typeof fetch;
});

beforeEach(async () => {
  jest.useFakeTimers();
  server.generation = null;
  server.active = null;
  server.refuseStart = null;
  server.polls = 0;
  await session.save(fakeTokens());
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (url, init) => {
    const path = new URL(url).pathname;
    const method = init.method ?? 'GET';
    if (method === 'POST' && path === '/api/v1/generations') {
      if (server.refuseStart) {
        return server.refuseStart;
      }
      server.generation = generation();
      return fakeResponse(202, server.generation);
    }
    if (path === '/api/v1/generations/active') {
      return server.active ? fakeResponse(200, server.active) : fakeResponse(204);
    }
    if (method === 'DELETE') {
      server.generation = { ...server.generation!, status: 'cancelled', position: null };
      return fakeResponse(200, server.generation);
    }
    server.polls += 1;
    return fakeResponse(200, server.generation);
  });
});

afterEach(() => {
  jest.useRealTimers();
});

function renderFlow(artworkId?: string) {
  const queryClient = testQueryClient();
  const invalidated = jest.spyOn(queryClient, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { invalidated, rendering: renderHook(() => useGenerationFlow(artworkId), { wrapper }) };
}

describe('useGenerationFlow', () => {
  it('starts a generation and follows it until the artwork is made', async () => {
    const { invalidated, rendering } = renderFlow();
    const { result } = await rendering;

    await act(async () => result.current.start(request));
    await waitFor(() => expect(result.current.generation?.status).toBe('queued'));

    server.generation = generation({ status: 'running', step: 7, position: null });
    await waitFor(() => expect(result.current.generation?.step).toBe(7), nextPoll);

    server.generation = generation({ status: 'succeeded', step: 20, position: null, artworkId: 'a1' });
    await waitFor(() => expect(result.current.generation?.artworkId).toBe('a1'), nextPoll);
    expect(invalidated).toHaveBeenCalledWith({ queryKey: ['artworks'] });

    const polls = server.polls;
    await act(async () => jest.advanceTimersByTime(5000));
    expect(server.polls).toBe(polls);
  });

  it("picks up this screen's generation still in progress", async () => {
    server.active = generation({ status: 'running', step: 3, position: null });
    server.generation = server.active;

    const { result } = await renderFlow().rendering;

    await waitFor(() => expect(result.current.generation?.step).toBe(3));
  });

  it("leaves another screen's generation alone", async () => {
    server.active = generation({ status: 'running', artworkId: 'someone-elses-redraw' });

    const { result } = await renderFlow('this-artwork').rendering;
    await act(async () => jest.advanceTimersByTime(3000));

    expect(result.current.generation).toBeNull();
  });

  it('cancels, and can start again', async () => {
    const { result } = await renderFlow().rendering;
    await act(async () => result.current.start(request));
    await waitFor(() => expect(result.current.generation).not.toBeNull());

    await act(async () => result.current.cancel());
    await waitFor(() => expect(result.current.generation?.status).toBe('cancelled'));

    await act(async () => result.current.reset());
    expect(result.current.generation).toBeNull();
  });

  it('reports a generation that could not start', async () => {
    server.refuseStart = fakeResponse(409, { title: 'A generation is already in progress.' });
    const { result } = await renderFlow().rendering;
    const onError = jest.fn();

    await act(async () => result.current.start(request, { onError }));

    await waitFor(() => expect(onError).toHaveBeenCalledWith(expect.objectContaining({ status: 409 })));
    expect(result.current.generation).toBeNull();
  });
});

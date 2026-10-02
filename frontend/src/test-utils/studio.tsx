import { jest } from '@jest/globals';
import React, { type ReactElement } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import type { ArtworkDetails, Generation, GenerationRequest, Stroke, Style } from '@/api/types';
import { BrushProvider } from '@/lib/brush';
import { DrawingProvider } from '@/lib/drawing';
import { PreferencesProvider } from '@/lib/preferences';
import { StudioProvider, useStudio, type Studio } from '@/lib/studio';
import { fakeResponse, testQueryClient } from './index';

export const line = (color: string): Stroke => ({ path: ['M1,1', 'L9,9'], color, size: 6 });

export const couch: ArtworkDetails = {
  id: 'a1',
  title: 'Couch',
  description: 'a comfy couch',
  style: null,
  creationDateTime: '2026-09-30T12:00:00Z',
  sketchImageUrl: 'https://account.r2.cloudflarestorage.com/artifyme/users/1/sketch.png?X-Amz-Signature=s',
  aiImageUrl: 'https://account.r2.cloudflarestorage.com/artifyme/users/1/image.webp?X-Amz-Signature=a',
  paths: [line('#000000')],
  howItWasMade: null,
};

export function generation(changes: Partial<Generation> = {}): Generation {
  return {
    id: 'g1',
    status: 'queued',
    error: null,
    step: 0,
    totalSteps: 25,
    position: 2,
    seed: 42,
    artworkId: null,
    createdAt: '2026-09-30T12:00:00Z',
    startedAt: null,
    preview: null,
    ...changes,
  };
}

export const styles: Style[] = [
  { id: 'watercolor', name: 'Watercolor', words: 'watercolor painting, soft washes' },
  { id: 'pencil', name: 'Pencil', words: 'pencil drawing, graphite shading' },
];

export function fakeStudioApi() {
  const api = {
    artwork: null as ArtworkDetails | null,
    generation: null as Generation | null,
    active: null as Generation | null,
    started: [] as GenerationRequest[],
    edits: [] as unknown[],
    refuseStart: null as Response | Error | null,
    fetch: jest.fn<(url: string, init: RequestInit) => Promise<Response>>(),
  };

  api.fetch.mockImplementation(async (url, init) => {
    const { pathname } = new URL(url);
    const method = init.method ?? 'GET';
    const body = typeof init.body === 'string' ? JSON.parse(init.body) : undefined;

    if (pathname === '/api/v1/styles') {
      return fakeResponse(200, styles);
    }
    if (pathname === '/api/v1/generations' && method === 'POST') {
      const refusal = api.refuseStart;
      if (refusal) {
        api.refuseStart = null;
        if (refusal instanceof Error) {
          throw refusal;
        }
        return refusal;
      }
      api.started.push(body);
      api.generation = generation({ id: `g${api.started.length}`, artworkId: body.artworkId ?? null });
      return fakeResponse(202, api.generation);
    }
    if (pathname === '/api/v1/generations/active') {
      return api.active ? fakeResponse(200, api.active) : fakeResponse(204);
    }
    if (pathname.startsWith('/api/v1/generations/') && method === 'DELETE') {
      api.generation = { ...api.generation!, status: 'cancelled', position: null };
      return fakeResponse(200, api.generation);
    }
    if (pathname.startsWith('/api/v1/generations/')) {
      return fakeResponse(200, api.active ?? api.generation);
    }
    if (pathname === '/api/v1/auth/sessions/refresh') {
      return fakeResponse(401, { title: 'The session has ended.' });
    }
    if (pathname.startsWith('/api/v1/artworks/') && method === 'PATCH') {
      api.edits.push(body);
      return fakeResponse(204);
    }
    if (pathname.startsWith('/api/v1/artworks/')) {
      return api.artwork ? fakeResponse(200, api.artwork) : fakeResponse(404);
    }
    throw new Error(`The studio sent an unexpected ${method} ${pathname}`);
  });

  return api;
}

export async function renderInStudio(screen: ReactElement, artworkId?: string) {
  const queryClient = testQueryClient();
  let studio: Studio;
  function StudioHandle() {
    studio = useStudio();
    return null;
  }

  await render(
    <QueryClientProvider client={queryClient}>
      <PreferencesProvider>
        <DrawingProvider>
          <BrushProvider>
            <StudioProvider artworkId={artworkId}>
              {screen}
              <StudioHandle />
            </StudioProvider>
          </BrushProvider>
        </DrawingProvider>
      </PreferencesProvider>
    </QueryClientProvider>,
  );
  return () => studio;
}

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cancelGeneration, getActiveGeneration, getGeneration, isInProgress, startGeneration } from '@/api/generations';
import type { Generation, GenerationRequest } from '@/api/types';
import { useSession } from '@/lib/session';
import { artworkKeys } from './use-artworks';

const POLL_INTERVAL_MS = 1000;
const ACTIVE_POLL_INTERVAL_MS = 2000;

export const generationKeys = {
  active: ['generations', 'active'] as const,
  detail: (id: string) => ['generations', 'detail', id] as const,
};

export interface GenerationFlow {
  generation: Generation | null;
  start: (request: GenerationRequest, callbacks?: { onError?: (error: unknown) => void }) => void;
  isStarting: boolean;
  cancel: (callbacks?: { onError?: (error: unknown) => void }) => void;
  isCancelling: boolean;
  reset: () => void;
}

export function useGenerationFlow(artworkId?: string): GenerationFlow {
  const queryClient = useQueryClient();
  const signedIn = useSession().status === 'signedIn';
  const [id, setId] = useState<string | null>(null);

  const active = useQuery({
    queryKey: generationKeys.active,
    queryFn: ({ signal }) => getActiveGeneration(signal),
    enabled: signedIn && id === null,
  });

  // Only pick up this screen's own generation; a new drawing has no artworkId yet
  const found = active.data;
  if (id === null && found && (found.artworkId ?? undefined) === artworkId) {
    setId(found.id);
  }

  const followed = useQuery({
    queryKey: generationKeys.detail(id ?? ''),
    queryFn: ({ signal }) => getGeneration(id!, signal),
    enabled: signedIn && id !== null,
    refetchInterval: (query) => (query.state.data && isInProgress(query.state.data) ? POLL_INTERVAL_MS : false),
  });
  const generation = id === null ? null : (followed.data ?? null);

  const finishedStatus = generation && !isInProgress(generation) ? generation.status : null;
  useEffect(() => {
    if (finishedStatus === null) {
      return;
    }
    queryClient.setQueryData(generationKeys.active, null);
    if (finishedStatus === 'succeeded') {
      queryClient.invalidateQueries({ queryKey: artworkKeys.all });
    }
  }, [finishedStatus, queryClient]);

  const starting = useMutation({
    mutationFn: startGeneration,
    onSuccess: (started) => {
      queryClient.setQueryData(generationKeys.detail(started.id), started);
      setId(started.id);
    },
  });

  const cancelling = useMutation({
    mutationFn: cancelGeneration,
    onSuccess: (ended) => queryClient.setQueryData(generationKeys.detail(ended.id), ended),
  });

  return {
    generation,
    start: (request, callbacks) => starting.mutate(request, { onError: (error) => callbacks?.onError?.(error) }),
    isStarting: starting.isPending,
    cancel: (callbacks) => {
      if (id !== null) {
        cancelling.mutate(id, { onError: (error) => callbacks?.onError?.(error) });
      }
    },
    isCancelling: cancelling.isPending,
    reset: () => {
      setId(null);
      starting.reset();
      cancelling.reset();
    },
  };
}

export function useActiveGeneration(): Generation | null {
  const queryClient = useQueryClient();
  const signedIn = useSession().status === 'signedIn';
  const active = useQuery({
    queryKey: generationKeys.active,
    queryFn: ({ signal }) => getActiveGeneration(signal),
    enabled: signedIn,
    refetchInterval: (query) => (query.state.data ? ACTIVE_POLL_INTERVAL_MS : false),
  });

  const current = active.data ?? null;
  const wasActive = useRef(false);
  useEffect(() => {
    if (current) {
      wasActive.current = true;
    } else if (wasActive.current) {
      wasActive.current = false;
      queryClient.invalidateQueries({ queryKey: artworkKeys.all });
    }
  }, [current, queryClient]);

  return signedIn ? current : null;
}

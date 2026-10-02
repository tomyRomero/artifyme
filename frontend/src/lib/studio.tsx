import { createContext, useContext, useEffect, useEffectEvent, useState, type ReactNode } from 'react';
import { useNavigation } from 'expo-router';
import { isInProgress } from '@/api/generations';
import type { ArtworkDetails, GenerationRequest } from '@/api/types';
import { useArtwork } from '@/hooks/use-artworks';
import { useGenerationFlow, type GenerationFlow } from '@/hooks/use-generation-flow';
import { useDrawing, type Drawing } from '@/lib/drawing';

export interface Words {
  description: string;
  title: string;
  style: string | null;
}

const NO_WORDS: Words = { description: '', title: '', style: null };

export interface Studio {
  artwork: ArtworkDetails | null;
  status: 'ready' | 'loading' | 'missing';
  drawing: Drawing;
  words: Words;
  setWords: (words: Words) => void;
  flow: GenerationFlow;
  startError: unknown;
  sent: GenerationRequest | null;
  resumed: boolean;
  generate: (sketch: string) => void;
  sendAgain: () => void;
}

const StudioContext = createContext<Studio | undefined>(undefined);

interface StudioProviderProps {
  artworkId?: string;
  children: ReactNode;
}

export function StudioProvider({ artworkId, children }: StudioProviderProps) {
  const editing = useArtwork(artworkId ?? null);
  const artwork = artworkId ? (editing.data ?? null) : null;
  const status =
    !artworkId || artwork ? 'ready' : editing.isPending && editing.fetchStatus !== 'idle' ? 'loading' : 'missing';

  const drawing = useDrawing(artworkId);
  const flow = useGenerationFlow(artworkId);
  const [words, setWords] = useState<Words>(NO_WORDS);
  const [sent, setSent] = useState<GenerationRequest | null>(null);
  const [startError, setStartError] = useState<unknown>(null);

  // Once per artwork, so a refetch never overwrites the edits in progress
  const [wordsFor, setWordsFor] = useState<string | null>(null);
  if (artwork && wordsFor !== artwork.id) {
    setWordsFor(artwork.id);
    setWords({ description: artwork.description ?? '', title: artwork.title, style: artwork.style });
  }
  const startEditing = useEffectEvent(() => {
    if (artwork) {
      drawing.start(artwork.paths);
    }
    return drawing.discard;
  });
  const loadedId = artwork?.id;
  useEffect(() => {
    if (loadedId) {
      return startEditing();
    }
  }, [loadedId]);

  // On success a new drawing starts over, and an edit continues from what was sent
  const startOver = useEffectEvent(() => drawing.start(artworkId ? sent?.paths : undefined));
  const succeeded = flow.generation?.status === 'succeeded' ? flow.generation.id : null;
  useEffect(() => {
    if (succeeded) {
      startOver();
    }
  }, [succeeded]);

  const send = (request: GenerationRequest) => {
    setSent(request);
    setStartError(null);
    flow.reset();
    flow.start(request, { onError: setStartError });
  };

  const value: Studio = {
    artwork,
    status,
    drawing,
    words,
    setWords,
    flow,
    startError,
    sent,
    resumed: sent === null && flow.generation !== null && isInProgress(flow.generation),
    generate: (sketch) =>
      send({
        sketch,
        description: words.description.trim(),
        title: words.title.trim(),
        style: words.style ?? undefined,
        paths: drawing.paths,
        artworkId,
      }),
    sendAgain: () => {
      if (sent) {
        // After a new artwork is made, "again" redraws it rather than making a second one
        send({ ...sent, artworkId: flow.generation?.artworkId ?? sent.artworkId });
      }
    },
  };

  return <StudioContext value={value}>{children}</StudioContext>;
}

export function useStudio(): Studio {
  const context = useContext(StudioContext);
  if (!context) {
    throw new Error('useStudio must be used within a StudioProvider');
  }
  return context;
}

export function useCloseStudio(): () => void {
  const navigation = useNavigation();
  return () => navigation.getParent()?.goBack();
}

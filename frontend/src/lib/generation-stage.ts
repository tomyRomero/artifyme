import { ApiError } from '@/api/client';
import type { Generation, GenerationError } from '@/api/types';
import type { IconName } from '@/components/ui';

export type Stage =
  | { kind: 'sending' }
  | { kind: 'queued'; ahead: number | null }
  | { kind: 'painting'; step: number; total: number }
  | { kind: 'done'; artworkId: string }
  | { kind: 'failed'; problem: Problem }
  | { kind: 'cancelled' };

export interface Problem {
  icon: IconName;
  title: string;
  message: string;
  action: 'retry' | 'describe' | 'sign-in';
  // Offered too, for when the words might be the cause
  reword?: boolean;
}

export function stageOf(generation: Generation | null, startError: unknown): Stage {
  if (startError) {
    return { kind: 'failed', problem: startProblem(startError) };
  }
  if (generation === null) {
    return { kind: 'sending' };
  }
  switch (generation.status) {
    case 'queued':
      return { kind: 'queued', ahead: generation.position };
    case 'running':
      return { kind: 'painting', step: generation.step, total: generation.totalSteps };
    case 'succeeded':
      return generation.artworkId
        ? { kind: 'done', artworkId: generation.artworkId }
        : { kind: 'failed', problem: generationProblem('generation_failed') };
    case 'failed':
      return { kind: 'failed', problem: generationProblem(generation.error) };
    case 'cancelled':
      return { kind: 'cancelled' };
  }
}

export function stageText(stage: Stage): string {
  switch (stage.kind) {
    case 'sending':
      return 'Sending your sketch…';
    case 'queued':
      return stage.ahead ? `In line: ${stage.ahead} ahead of you` : 'Starting…';
    case 'painting':
      return stage.total > 0 ? `Painting… ${stage.step} of ${stage.total}` : 'Painting…';
    case 'done':
      return 'Saving to your gallery…';
    case 'failed':
      return stage.problem.title;
    case 'cancelled':
      return 'Cancelled';
  }
}

export function stageProgress(stage: Stage): number | undefined {
  switch (stage.kind) {
    case 'painting':
      return stage.total > 0 ? stage.step / stage.total : undefined;
    case 'done':
      return 1;
    default:
      return undefined;
  }
}

export function startProblem(error: unknown): Problem {
  if (!(error instanceof ApiError)) {
    return somethingWrong;
  }
  if (error.status === 401 || error.sessionEnded) {
    return {
      icon: 'log-in-outline',
      title: 'Please sign in again',
      message: 'Your session has ended. Your sketch will be waiting.',
      action: 'sign-in',
    };
  }
  if (error.status === 0 && !error.timedOut) {
    return {
      icon: 'cloud-offline-outline',
      title: "Can't reach ArtifyMe",
      message: 'Your sketch is safe. Check your connection, then try again.',
      action: 'retry',
    };
  }
  if (error.code === 'image_storage_unavailable') {
    return {
      icon: 'images-outline',
      title: "Images can't be saved right now",
      message: "The server's image storage isn't set up yet, so artworks can't be made. Your sketch is safe.",
      action: 'retry',
    };
  }
  if (error.status === 0 || error.status >= 500) {
    return {
      icon: 'hourglass-outline',
      title: 'That took too long on our side',
      message: 'The studio is slow or unavailable right now. Try again in a moment.',
      action: 'retry',
    };
  }
  switch (error.status) {
    case 429:
      return {
        icon: 'people-outline',
        title: 'The studio is busy',
        message: 'Lots of sketches are being painted right now. Try again in a minute.',
        action: 'retry',
      };
    case 409:
      return {
        icon: 'brush-outline',
        title: 'Another artwork is being made',
        message: "Artworks are made one at a time. Try again once it's in your gallery.",
        action: 'retry',
      };
    case 400:
      return {
        icon: 'alert-circle-outline',
        title: "That couldn't be sent",
        message: error.message,
        action: 'describe',
      };
    default:
      return somethingWrong;
  }
}

export function generationProblem(error: GenerationError | null): Problem {
  switch (error) {
    case 'filtered':
      return {
        icon: 'eye-off-outline',
        title: 'The safety filter stopped this one',
        message:
          'It sometimes flags harmless drawings. Trying again paints a new version, or you can change the words.',
        action: 'retry',
        reword: true,
      };
    case 'interrupted':
      return {
        icon: 'refresh-outline',
        title: 'It stopped partway',
        message: 'The studio restarted before your artwork was finished. Try again.',
        action: 'retry',
      };
    default:
      return somethingWrong;
  }
}

const somethingWrong: Problem = {
  icon: 'alert-circle-outline',
  title: 'Something went wrong',
  message: "Your artwork wasn't made. Try again, or change the sketch or the words.",
  action: 'retry',
};

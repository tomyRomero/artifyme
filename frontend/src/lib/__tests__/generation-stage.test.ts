import { describe, expect, it } from '@jest/globals';
import { ApiError } from '@/api/client';
import type { Generation } from '@/api/types';
import { stageOf, stageProgress, stageText, startProblem } from '@/lib/generation-stage';

function generation(changes: Partial<Generation>): Generation {
  return {
    id: 'g1',
    status: 'queued',
    error: null,
    step: 0,
    totalSteps: 25,
    position: null,
    seed: 1,
    artworkId: null,
    createdAt: '2026-09-30T12:00:00Z',
    startedAt: null,
    preview: null,
    ...changes,
  };
}

describe('stageOf', () => {
  it('follows a generation from sending to done', () => {
    const sending = stageOf(null, null);
    const queued = stageOf(generation({ status: 'queued', position: 2 }), null);
    const painting = stageOf(generation({ status: 'running', step: 12 }), null);
    const done = stageOf(generation({ status: 'succeeded', artworkId: 'a1' }), null);

    expect([sending, queued, painting, done].map(stageText)).toEqual([
      'Sending your sketch…',
      'In line: 2 ahead of you',
      'Painting… 12 of 25',
      'Saving to your gallery…',
    ]);
    expect([sending, queued, painting, done].map(stageProgress)).toEqual([undefined, undefined, 0.48, 1]);
  });

  it('says a generation is starting once nothing is ahead of it', () => {
    expect(stageText(stageOf(generation({ status: 'queued', position: 0 }), null))).toBe('Starting…');
  });

  it('turns a failure into a problem with a way forward', () => {
    const filtered = stageOf(generation({ status: 'failed', error: 'filtered' }), null);

    expect(filtered).toMatchObject({
      kind: 'failed',
      problem: { title: 'The safety filter stopped this one', action: 'retry', reword: true },
    });
  });

  it('puts an error that stopped the start before any generation', () => {
    const stage = stageOf(generation({ status: 'running' }), new ApiError('Too many', 429));

    expect(stage).toMatchObject({ kind: 'failed', problem: { title: 'The studio is busy' } });
  });
});

describe('startProblem', () => {
  it('tells no answer from a slow server', () => {
    expect(startProblem(new ApiError("Couldn't reach", 0)).title).toBe("Can't reach ArtifyMe");
    expect(startProblem(new ApiError('Too long', 0, { timedOut: true })).title).toBe('That took too long on our side');
    expect(startProblem(new ApiError('Unavailable', 503)).title).toBe('That took too long on our side');
  });

  it("says when the server can't store images, rather than that it's slow", () => {
    const unavailable = new ApiError("Images are unavailable: the server's image storage isn't set up.", 503, {
      body: {
        title: "Images are unavailable: the server's image storage isn't set up.",
        code: 'image_storage_unavailable',
      },
    });

    expect(startProblem(unavailable)).toMatchObject({ title: "Images can't be saved right now", action: 'retry' });
  });

  it('asks to sign in again when the session has ended', () => {
    expect(startProblem(new ApiError('Session ended', 401, { sessionEnded: true })).action).toBe('sign-in');
  });

  it("passes on the API's reason for refusing the sketch or words", () => {
    expect(startProblem(new ApiError('The sketch must be at most 5 MB.', 400))).toMatchObject({
      message: 'The sketch must be at most 5 MB.',
      action: 'describe',
    });
  });

  it('explains that artworks are made one at a time', () => {
    expect(startProblem(new ApiError('In progress', 409)).title).toBe('Another artwork is being made');
  });

  it('falls back to a general message for anything else', () => {
    expect(startProblem(new Error('bug')).title).toBe('Something went wrong');
  });
});

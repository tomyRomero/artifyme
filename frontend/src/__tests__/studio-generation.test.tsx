import { afterEach, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import GenerationScreen from '@/app/studio/generation';
import type { Studio } from '@/lib/studio';
import { durations } from '@/theme/motion';
import { session } from '@/lib/session';
import { fakeResponse, fakeTokens, setUpNotifications, storedValue } from '@/test-utils';
import { couch, fakeStudioApi, generation, line, renderInStudio } from '@/test-utils/studio';

jest.mock('expo-router', () => require('@/test-utils/router').expoRouter);
// The reveal runs in JS so the tests see it end
jest.mock('@/theme/motion', () => ({ ...jest.requireActual<object>('@/theme/motion'), nativeDriver: false }));

let api: ReturnType<typeof fakeStudioApi>;
let studio: () => Studio;
const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});

// Polls are a second apart, longer than waitFor's default timeout
const nextPoll = { timeout: 3000 };

beforeAll(() => {
  process.env.EXPO_PUBLIC_DOTNET_API_URL = 'https://api.test';
});

beforeEach(async () => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  api = fakeStudioApi();
  global.fetch = api.fetch as unknown as typeof fetch;
  await session.save(fakeTokens());
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

async function send() {
  studio = await renderInStudio(<GenerationScreen />);
  await act(async () => {
    studio().drawing.draw(line('#FF0000'));
    studio().setWords({ description: 'a comfy couch', title: 'Comfy couch', style: null });
  });
  await act(async () => studio().generate('data:image/png;base64,AAAA'));
}

async function finish() {
  api.artwork = couch;
  api.generation = generation({ status: 'succeeded', position: null, step: 25, artworkId: 'a1' });
  await waitFor(() => expect(screen.getByText('Saved to your gallery')).toBeTruthy(), nextPoll);
}

describe('while the artwork is painted', () => {
  it('shows each stage, with the sketch, on a rainbow bar', async () => {
    await send();
    expect(await screen.findByText('In line: 2 ahead of you')).toBeTruthy();

    api.generation = generation({ status: 'running', position: null, step: 10 });

    await waitFor(() => expect(screen.getByText('Painting… 10 of 25')).toBeTruthy(), nextPoll);
    expect(screen.getByRole('progressbar').props.accessibilityValue).toEqual({ min: 0, max: 100, now: 40 });
  });

  it('shows the painting as it forms, and keeps earlier steps to look back at', async () => {
    const hidden = { includeHiddenElements: true };
    await send();

    api.generation = generation({ status: 'running', position: null, step: 1, preview: 'data:image/webp;base64,AAA1' });
    await waitFor(() => expect(screen.getByText('Live preview', hidden)).toBeTruthy(), nextPoll);
    api.generation = generation({ status: 'running', position: null, step: 7, preview: 'data:image/webp;base64,AAA7' });
    await waitFor(() => expect(screen.getByTestId('frame-7', hidden)).toBeTruthy(), nextPoll);

    await fireEvent.press(screen.getByTestId('frame-1', hidden));
    expect(screen.getByText('Step 1', hidden)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('frame-1', hidden));
    expect(screen.getByText('Live preview', hidden)).toBeTruthy();
  });

  it('tells screen readers the milestones, not every step', async () => {
    await send();
    await waitFor(() => expect(announce).toHaveBeenCalledWith('In line'));

    api.generation = generation({ status: 'running', position: null, step: 13 });
    await waitFor(() => expect(announce).toHaveBeenCalledWith('Halfway there'), nextPoll);

    await finish();
    expect(announce).toHaveBeenCalledWith('Your artwork is ready');
  });

  it('cancels, back to the words', async () => {
    await send();

    await fireEvent.press(await screen.findByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(router.back).toHaveBeenCalled());
    expect(studio().flow.generation).toBeNull();
  });
});

describe('notifications while it paints', () => {
  const offer = "Get a notification when it's ready?";

  it('offers a notification, and says one is coming once allowed', async () => {
    setUpNotifications();
    await send();

    await fireEvent.press(await screen.findByRole('button', { name: 'Notify me' }));

    await waitFor(() =>
      expect(screen.getByText("You can close this. You'll get a notification when it's ready.")).toBeTruthy(),
    );
    expect(screen.queryByText(offer)).toBeNull();
    await act(async () => jest.advanceTimersByTime(1000));
    expect(storedValue('preferences')).toMatchObject({ artworkNotifications: true });
  });

  it('stops offering once turned down', async () => {
    setUpNotifications();
    await send();

    await fireEvent.press(await screen.findByRole('button', { name: 'Not now' }));

    expect(screen.queryByText(offer)).toBeNull();
    await act(async () => jest.advanceTimersByTime(1000));
    expect(storedValue('preferences')).toMatchObject({
      artworkNotifications: false,
      artworkNotificationsOffered: true,
    });
  });

  it("isn't offered where notifications can't work", async () => {
    await send();
    expect(await screen.findByText('In line: 2 ahead of you')).toBeTruthy();

    expect(screen.queryByText(offer)).toBeNull();
  });
});

describe('the artwork made', () => {
  it('is saved, and shown over its sketch to compare', async () => {
    await send();

    await finish();

    expect(screen.getByRole('adjustable', { name: 'Couch: sketch and artwork' })).toBeTruthy();
    expect(screen.getByText('Couch')).toBeTruthy();
    expect(screen.getByText('a comfy couch')).toBeTruthy();
  });

  it('is felt when it is ready', async () => {
    await send();
    api.generation = generation({ status: 'running', position: null, step: 13 });
    await waitFor(() => expect(announce).toHaveBeenCalledWith('Halfway there'), nextPoll);
    expect(Haptics.notificationAsync).not.toHaveBeenCalled();

    await finish();

    expect(jest.mocked(Haptics.notificationAsync).mock.calls).toEqual([['success']]);
  });

  it('is revealed from its sketch as soon as its image has loaded', async () => {
    await send();
    await finish();
    const sketch = () => screen.queryByTestId('reveal-sketch', { includeHiddenElements: true });
    expect(sketch()).not.toBeNull();

    await fireEvent(screen.getByTestId('artwork-image', { includeHiddenElements: true }), 'load', {
      nativeEvent: { source: { url: couch.aiImageUrl, width: 512, height: 768 } },
    });
    await act(async () => jest.advanceTimersByTime(durations.slow));

    expect(sketch()).toBeNull();
  });

  it('clears the new drawing, which is saved with it', async () => {
    await send();

    await finish();

    expect(studio().drawing.paths).toEqual([]);
  });

  it('gets a new image from the same sketch and words when tried again', async () => {
    await send();
    await finish();

    await fireEvent.press(screen.getByRole('button', { name: 'Try again: a new image from the same sketch' }));

    await waitFor(() => expect(api.started).toHaveLength(2));
    expect(api.started[1]).toEqual({ ...api.started[0], artworkId: 'a1' });
  });
});

describe('when something goes wrong', () => {
  it('explains a failure, and tries again with the same sketch and words', async () => {
    await send();
    api.generation = generation({ status: 'failed', error: 'interrupted', position: null });

    await waitFor(() => expect(screen.getByText('It stopped partway')).toBeTruthy(), nextPoll);
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));

    await waitFor(() => expect(api.started).toHaveLength(2));
    expect(api.started[1]).toEqual(api.started[0]);
  });

  it('offers a new version, or new words, when the safety filter held the image back', async () => {
    await send();
    api.generation = generation({ status: 'failed', error: 'filtered', position: null });

    await waitFor(() => expect(screen.getByText('The safety filter stopped this one')).toBeTruthy(), nextPoll);
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Change the description' }));

    expect(router.back).toHaveBeenCalled();
  });

  it('goes back to the canvas to edit the sketch', async () => {
    await send();
    api.generation = generation({ status: 'failed', error: 'generation_failed', position: null });

    await waitFor(() => expect(screen.getByText('Something went wrong')).toBeTruthy(), nextPoll);
    await fireEvent.press(screen.getByRole('button', { name: 'Edit the sketch' }));

    expect(router.dismissAll).toHaveBeenCalled();
    expect(studio().drawing.paths).toEqual([line('#FF0000')]);
  });

  it("says when ArtifyMe can't be reached, keeping the sketch", async () => {
    api.refuseStart = new TypeError('Network request failed');

    await send();

    expect(await screen.findByText("Can't reach ArtifyMe")).toBeTruthy();
    expect(studio().drawing.paths).toEqual([line('#FF0000')]);
  });

  it('asks to sign in again when the session has ended', async () => {
    api.refuseStart = fakeResponse(401);

    await send();

    expect(await screen.findByText('Please sign in again')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
    expect(router.push).toHaveBeenCalledWith('/login');
  });
});

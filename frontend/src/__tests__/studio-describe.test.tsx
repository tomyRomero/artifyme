import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { captureRef } from 'react-native-view-shot';
import DescribeScreen from '@/app/studio/describe';
import type { Studio } from '@/lib/studio';
import { session } from '@/lib/session';
import { fakeTokens } from '@/test-utils';
import { goBack } from '@/test-utils/router';
import { couch, fakeStudioApi, line, renderInStudio } from '@/test-utils/studio';

jest.mock('expo-router', () => require('@/test-utils/router').expoRouter);
jest.mock('react-native-view-shot', () => ({
  captureRef: jest.fn(async () => 'data:image/png;base64,AAAA'),
}));

let api: ReturnType<typeof fakeStudioApi>;
let studio: () => Studio;

beforeAll(() => {
  process.env.EXPO_PUBLIC_DOTNET_API_URL = 'https://api.test';
});

beforeEach(async () => {
  jest.clearAllMocks();
  api = fakeStudioApi();
  global.fetch = api.fetch as unknown as typeof fetch;
  await session.save(fakeTokens());
});

async function renderDescribe(artworkId?: string) {
  studio = await renderInStudio(<DescribeScreen />, artworkId);
  if (artworkId) {
    await waitFor(() => expect(studio().status).toBe('ready'));
  }
}

async function type(label: string, text: string) {
  await fireEvent.changeText(screen.getByLabelText(label), text);
}

describe('describing a new sketch', () => {
  beforeEach(async () => {
    await renderDescribe();
    await act(async () => studio().drawing.draw(line('#FF0000')));
  });

  it('sends the sketch, the drawing and the trimmed words, then shows the progress', async () => {
    await type('Description', '  a comfy couch ');
    await type('Title', '  Sunday couch ');

    await fireEvent.press(screen.getByRole('button', { name: 'Generate' }));

    await waitFor(() => expect(api.started).toHaveLength(1));
    expect(api.started[0]).toEqual({
      sketch: 'data:image/png;base64,AAAA',
      description: 'a comfy couch',
      title: 'Sunday couch',
      paths: [line('#FF0000')],
    });
    expect(router.push).toHaveBeenCalledWith('/studio/generation');
  });

  it('suggests a title from the description until the title is changed', async () => {
    await type('Description', 'a red velvet couch in a sunny room');

    expect(screen.getByLabelText('Title').props.value).toBe('Red velvet couch');
    expect(screen.getByText('Suggested from your description')).toBeTruthy();

    await type('Title', 'Sunday couch');
    await type('Description', 'a green couch');

    expect(screen.getByLabelText('Title').props.value).toBe('Sunday couch');
    expect(screen.queryByText('Suggested from your description')).toBeNull();
  });

  it("adds a style's words to what the model reads, and sends the style", async () => {
    await type('Description', 'a comfy couch');

    await fireEvent.press(await screen.findByRole('button', { name: 'Watercolor' }));

    expect(screen.getByRole('button', { name: 'Watercolor' })).toBeSelected();
    expect(screen.getByText(', watercolor painting, soft washes')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Generate' }));
    await waitFor(() => expect(api.started).toHaveLength(1));
    expect(api.started[0]).toMatchObject({ description: 'a comfy couch', style: 'watercolor' });
  });

  it('sends no style when None is picked', async () => {
    await type('Description', 'a comfy couch');
    await fireEvent.press(await screen.findByRole('button', { name: 'Pencil' }));
    await fireEvent.press(screen.getByRole('button', { name: 'None' }));

    await fireEvent.press(screen.getByRole('button', { name: 'Generate' }));

    await waitFor(() => expect(api.started).toHaveLength(1));
    expect(api.started[0]).not.toHaveProperty('style');
  });

  it('needs a title', async () => {
    await type('Description', 'a comfy couch');
    await type('Title', '   ');

    await fireEvent.press(screen.getByRole('button', { name: 'Generate' }));

    expect(await screen.findByText('Give it a title')).toBeTruthy();
    expect(api.started).toEqual([]);
  });

  it('asks what was drawn before sending anything, and tells screen readers', async () => {
    jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
    await type('Description', '   ');

    await fireEvent.press(screen.getByRole('button', { name: 'Generate' }));

    expect(await screen.findByText('Say what you drew, in a few words')).toBeTruthy();
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
      'Say what you drew, in a few words. Give it a title.',
    );
    expect(api.started).toEqual([]);
    expect(router.push).not.toHaveBeenCalled();
  });

  it('points out a mistake when leaving the field', async () => {
    await type('Description', 'ab');

    await fireEvent(screen.getByLabelText('Description'), 'blur');

    expect(screen.getByText('Use at least 3 characters')).toBeTruthy();
  });

  it('says so when the sketch could not be read, and sends nothing', async () => {
    jest.mocked(captureRef).mockRejectedValueOnce(new Error('No view'));
    await type('Description', 'a comfy couch');

    await fireEvent.press(screen.getByRole('button', { name: 'Generate' }));

    expect(await screen.findByText("Couldn't read your sketch. Try again.")).toBeTruthy();
    expect(api.started).toEqual([]);
  });
});

describe('describing as a guest', () => {
  it('asks to sign in before generating, keeping everything', async () => {
    await session.signOut();
    await renderDescribe();
    await act(async () => studio().drawing.draw(line('#FF0000')));
    await type('Description', 'a comfy couch');

    await fireEvent.press(screen.getByRole('button', { name: 'Sign in to generate' }));

    expect(router.push).toHaveBeenCalledWith('/login');
    expect(api.started).toEqual([]);
    expect(studio().words.description).toBe('a comfy couch');
  });
});

describe('describing an edit', () => {
  beforeEach(() => {
    api.artwork = couch;
  });

  it("starts from the artwork's words", async () => {
    await renderDescribe('a1');

    expect(screen.getByLabelText('Description').props.value).toBe('a comfy couch');
    expect(screen.getByLabelText('Title').props.value).toBe('Couch');
  });

  it('saves only the words when the drawing is unchanged', async () => {
    await renderDescribe('a1');
    await type('Title', ' Sunday couch ');

    await fireEvent.press(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(goBack).toHaveBeenCalled());
    expect(api.edits).toEqual([{ title: 'Sunday couch', description: 'a comfy couch' }]);
    expect(api.started).toEqual([]);
  });

  it('makes a new image of the artwork when the style has changed', async () => {
    await renderDescribe('a1');

    await fireEvent.press(await screen.findByRole('button', { name: 'Pencil' }));

    expect(screen.getByText('The style has changed, so a new image will be made.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Make a new image' }));
    await waitFor(() => expect(api.started).toHaveLength(1));
    expect(api.started[0]).toMatchObject({ artworkId: 'a1', style: 'pencil' });
  });

  it('makes a new image of the artwork when the drawing has changed', async () => {
    await renderDescribe('a1');
    await act(async () => studio().drawing.draw(line('#FF0000')));

    expect(screen.getByText('The sketch has changed, so a new image will be made.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Make a new image' }));

    await waitFor(() => expect(api.started).toHaveLength(1));
    expect(api.started[0]).toMatchObject({ artworkId: 'a1', paths: [line('#000000'), line('#FF0000')] });
    expect(api.edits).toEqual([]);
  });
});
